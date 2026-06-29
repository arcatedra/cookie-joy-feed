import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { z } from "zod";

interface StripeSession {
  id: string;
  client_secret?: string | null;
  url?: string | null;
}

const itemSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(200),
  price: z.number().positive().max(10000),
  qty: z.number().int().min(1).max(99),
  image: z.string().max(2000).optional(),
});

const addressSchema = z.object({
  name: z.string().min(2).max(120),
  street: z.string().min(2).max(200),
  apt: z.string().max(80).optional().default(""),
  city: z.string().min(1).max(120),
  zip: z.string().min(2).max(20),
  phone: z.string().min(4).max(40),
  country: z.string().length(2).default("US"),
});

const schema = z.object({
  items: z.array(itemSchema).min(1).max(40),
  email: z.string().trim().email().max(255),
  address: addressSchema,
  shipping: z.enum(["standard", "express"]).default("standard"),
});

const SHIPPING_RATES = {
  standard: { label: "Envío estándar (3-5 días)", amount: 0 },
  express: { label: "Envío exprés (1-2 días)", amount: 499 },
} as const;

export const createCartCheckout = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    // Resolve user (bearer) — guest checkout allowed.
    const { getRequest } = await import("@tanstack/react-start/server");
    let userId: string | null = null;
    let email = data.email.trim().toLowerCase();
    try {
      const req = getRequest();
      const auth = req?.headers.get("authorization");
      if (auth?.startsWith("Bearer ")) {
        const token = auth.slice(7);
        const { createClient } = await import("@supabase/supabase-js");
        const sb = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );
        const { data: claims } = await sb.auth.getClaims(token);
        if (claims?.claims?.sub) {
          userId = claims.claims.sub as string;
          email = (claims.claims.email as string | undefined)?.toLowerCase() ?? email;
        }
      }
    } catch {
      /* guest */
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { stripePost, paymentsEnvironmentForHost } = await import("./stripe.server");

    const host = getRequestHost();
    const env = paymentsEnvironmentForHost(host);
    const proto = host?.startsWith("localhost") ? "http" : "https";
    const origin = `${proto}://${host}`;

    const shippingRate = SHIPPING_RATES[data.shipping];
    const subtotalCents = data.items.reduce(
      (s, it) => s + Math.round(it.price * 100) * it.qty,
      0,
    );

    const lineItems = data.items.map((it) => ({
      quantity: it.qty,
      price_data: {
        currency: "usd",
        unit_amount: Math.round(it.price * 100),
        product_data: {
          name: it.name.slice(0, 250),
          ...(it.image && /^https?:\/\//.test(it.image) && { images: [it.image] }),
        },
      },
    }));

    let session: StripeSession;
    try {
      session = await stripePost<StripeSession>(
        "/v1/checkout/sessions",
        {
          mode: "payment",
          ui_mode: "embedded",
          return_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
          customer_email: email,
          line_items: lineItems,
          shipping_options: [
            {
              shipping_rate_data: {
                type: "fixed_amount",
                display_name: shippingRate.label,
                fixed_amount: { amount: shippingRate.amount, currency: "usd" },
                delivery_estimate: {
                  minimum: { unit: "business_day", value: data.shipping === "express" ? 1 : 3 },
                  maximum: { unit: "business_day", value: data.shipping === "express" ? 2 : 5 },
                },
              },
            },
          ],
          payment_intent_data: {
            description: `HAZOREX — Pedido (${data.items.reduce((s, it) => s + it.qty, 0)} galletas)`,
            metadata: {
              kind: "cookie_order",
              subject_email: email,
              subject_user_id: userId ?? "",
            },
          },
          metadata: {
            kind: "cookie_order",
            subject_email: email,
            subject_user_id: userId ?? "",
          },
        },
        env,
      );
    } catch (e) {
      console.error("[cart-checkout] stripe error", e);
      throw new Error("No se pudo iniciar el pago. Inténtalo de nuevo.");
    }

    // Snapshot the pending order.
    const { error: insertErr } = await supabaseAdmin.from("orders").insert({
      stripe_session_id: session.id,
      user_id: userId,
      email,
      items: data.items,
      subtotal_usd: subtotalCents / 100,
      shipping_usd: shippingRate.amount / 100,
      tax_usd: 0,
      total_usd: (subtotalCents + shippingRate.amount) / 100,
      currency: "usd",
      shipping_address: data.address,
      status: "pending",
      environment: env,
    });
    if (insertErr) {
      console.error("[cart-checkout] order insert failed", insertErr);
      throw new Error("No se pudo guardar el pedido. Inténtalo de nuevo.");
    }

    if (!session.client_secret) {
      throw new Error("Stripe no devolvió client_secret");
    }
    return { clientSecret: session.client_secret, sessionId: session.id };
  });

const getOrderSchema = z.object({ sessionId: z.string().min(8).max(200) });

export const getOrderBySession = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => getOrderSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Optional caller identity (used to gate sensitive fields if needed later).
    let callerEmail: string | null = null;
    let callerUserId: string | null = null;
    try {
      const { getRequest } = await import("@tanstack/react-start/server");
      const req = getRequest();
      const auth = req?.headers.get("authorization");
      if (auth?.startsWith("Bearer ")) {
        const token = auth.slice(7);
        const { createClient } = await import("@supabase/supabase-js");
        const sb = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );
        const { data: claims } = await sb.auth.getClaims(token);
        callerEmail = ((claims?.claims?.email as string | undefined) ?? "").toLowerCase() || null;
        callerUserId = (claims?.claims?.sub as string | undefined) ?? null;
      }
    } catch {
      /* anonymous viewer is fine — they only see safe fields */
    }

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select(
        "id, stripe_session_id, status, email, items, subtotal_usd, shipping_usd, tax_usd, total_usd, currency, paid_at, created_at, user_id",
      )
      .eq("stripe_session_id", data.sessionId)
      .maybeSingle();

    if (!order) return { found: false as const };

    const ownsByUser = callerUserId && order.user_id === callerUserId;
    const ownsByEmail = callerEmail && order.email.toLowerCase() === callerEmail;
    const canSeeEmail = Boolean(ownsByUser || ownsByEmail);

    return {
      found: true as const,
      order: {
        id: order.id,
        status: order.status as string,
        items: order.items,
        subtotal_usd: Number(order.subtotal_usd),
        shipping_usd: Number(order.shipping_usd),
        tax_usd: Number(order.tax_usd),
        total_usd: Number(order.total_usd),
        currency: order.currency,
        paid_at: order.paid_at,
        created_at: order.created_at,
        // Mask the email unless caller is the owner.
        email: canSeeEmail ? order.email : maskEmail(order.email),
      },
    };
  });

function maskEmail(e: string): string {
  const [user, domain] = e.split("@");
  if (!user || !domain) return "***";
  const visible = user.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(1, user.length - 2))}@${domain}`;
}
