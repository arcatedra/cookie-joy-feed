import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
  address: addressSchema,
  shipping: z.enum(["standard", "express"]).default("standard"),
});

const SHIPPING_RATES = {
  standard: { label: "Envío estándar (3-5 días)", amount: 0 },
  express: { label: "Envío exprés (1-2 días)", amount: 499 },
} as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const createCartCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context as {
      supabase: import("@supabase/supabase-js").SupabaseClient;
      userId: string;
      claims?: { email?: string };
    };
    const email = ((claims?.email as string | undefined) ?? "").toLowerCase();

    // Ensure the cliente row exists (auto-heal for pre-trigger users).
    await supabase
      .from("clientes")
      .upsert(
        { id: userId, email: email || `${userId}@hazorex.local`, nombre_completo: email.split("@")[0] || "Cliente" },
        { onConflict: "id", ignoreDuplicates: true },
      );

    const { paymentsEnvironmentForHost, stripePost } = await import("./stripe.server");
    const host = getRequestHost();
    const env = paymentsEnvironmentForHost(host);
    const proto = host?.startsWith("localhost") ? "http" : "https";
    const origin = `${proto}://${host}`;

    const shippingRate = SHIPPING_RATES[data.shipping];
    const subtotalCents = data.items.reduce(
      (s, it) => s + Math.round(it.price * 100) * it.qty,
      0,
    );
    const totalCents = subtotalCents + shippingRate.amount;

    // Insert the pedido row in "pendiente" state under RLS (auth.uid() = cliente_id).
    const { data: pedidoRow, error: pedErr } = await supabase
      .from("pedidos")
      .insert({
        cliente_id: userId,
        estado: "pendiente",
        subtotal: subtotalCents / 100,
        costo_envio: shippingRate.amount / 100,
        impuestos: 0,
        total: totalCents / 100,
        moneda: "USD",
        direccion_envio: data.address,
        metodo_pago: "stripe",
      })
      .select("id, numero_pedido")
      .single();
    if (pedErr || !pedidoRow) {
      console.error("[cart-checkout] failed to create pedido", pedErr);
      throw new Error("No se pudo crear el pedido. Inténtalo de nuevo.");
    }

    // Snapshot each item's name and price at purchase time.
    const itemsInsert = data.items.map((it) => ({
      pedido_id: pedidoRow.id,
      producto_id: UUID_RE.test(it.id) ? it.id : null,
      nombre_producto: it.name.slice(0, 200),
      precio_unitario: it.price,
      cantidad: it.qty,
      subtotal_item: Math.round(it.price * 100 * it.qty) / 100,
    }));
    const { error: itemsErr } = await supabase.from("pedido_items").insert(itemsInsert);
    if (itemsErr) {
      console.error("[cart-checkout] failed to insert pedido_items", itemsErr);
      await supabase.from("pedidos").delete().eq("id", pedidoRow.id);
      throw new Error("No se pudo guardar el detalle del pedido. Inténtalo de nuevo.");
    }

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
          customer_email: email || undefined,
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
            description: `HAZOREX ${pedidoRow.numero_pedido}`,
            metadata: {
              kind: "cookie_order",
              pedido_id: pedidoRow.id,
              cliente_id: userId,
            },
          },
          metadata: {
            kind: "cookie_order",
            pedido_id: pedidoRow.id,
            cliente_id: userId,
          },
        },
        env,
      );
    } catch (e) {
      console.error("[cart-checkout] stripe error", e);
      await supabase.from("pedido_items").delete().eq("pedido_id", pedidoRow.id);
      await supabase.from("pedidos").delete().eq("id", pedidoRow.id);
      throw new Error("No se pudo iniciar el pago. Inténtalo de nuevo.");
    }

    // Persist the Stripe session id on the pedido for the webhook lookup.
    await supabase
      .from("pedidos")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", pedidoRow.id);

    if (!session.client_secret) throw new Error("Stripe no devolvió client_secret");
    return {
      clientSecret: session.client_secret,
      sessionId: session.id,
      pedidoId: pedidoRow.id,
      numeroPedido: pedidoRow.numero_pedido,
    };
  });

const getOrderSchema = z.object({ sessionId: z.string().min(8).max(200) });

export const getOrderBySession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => getOrderSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as {
      supabase: import("@supabase/supabase-js").SupabaseClient;
      userId: string;
    };
    const { data: pedido } = await supabase
      .from("pedidos")
      .select(
        "id, numero_pedido, estado, subtotal, costo_envio, impuestos, total, moneda, creado_en, stripe_checkout_session_id, cliente_id",
      )
      .eq("stripe_checkout_session_id", data.sessionId)
      .eq("cliente_id", userId)
      .maybeSingle();
    if (!pedido) return { found: false as const };
    return {
      found: true as const,
      order: {
        id: pedido.id,
        numeroPedido: pedido.numero_pedido,
        status: pedido.estado,
        subtotal: Number(pedido.subtotal),
        shipping: Number(pedido.costo_envio),
        tax: Number(pedido.impuestos),
        total: Number(pedido.total),
        currency: pedido.moneda,
        createdAt: pedido.creado_en,
      },
    };
  });
