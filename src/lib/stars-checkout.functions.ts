import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { z } from "zod";
import { TOKEN_PACKAGES } from "./roulette-config";

const schema = z.object({
  packageId: z.enum(["stars_starter", "stars_popular", "stars_premium"]),
  email: z.string().trim().email().max(255).optional(),
});

interface StripeSession {
  id: string;
  url: string;
}

export const createStarsCheckout = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    const pkg = TOKEN_PACKAGES.find((p) => p.id === data.packageId);
    if (!pkg) throw new Error("Paquete inválido");

    // Resolve subject — bearer user OR guest email cookie.
    const { getRequest, getCookie } = await import("@tanstack/react-start/server");
    let userId: string | null = null;
    let email: string | null = data.email?.trim().toLowerCase() ?? null;

    try {
      const req = getRequest();
      const auth = req?.headers.get("authorization");
      if (auth?.startsWith("Bearer ")) {
        const token = auth.slice(7);
        const { createClient } = await import("@supabase/supabase-js");
        const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const { data: claims } = await sb.auth.getClaims(token);
        if (claims?.claims?.sub) {
          userId = claims.claims.sub as string;
          email = email ?? (claims.claims.email as string | undefined) ?? null;
        }
      }
    } catch {
      /* ignore */
    }

    if (!userId) {
      const guest = getCookie("origen_guest");
      if (guest) {
        const guestEmail = guest.split("|")[0];
        if (guestEmail) email = email ?? guestEmail;
      }
    }

    if (!userId && !email) {
      throw new Error("Inicia sesión o completa el formulario de participación gratuita primero.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { stripePost, paymentsEnvironmentForHost } = await import("./stripe.server");

    const host = getRequestHost();
    const env = paymentsEnvironmentForHost(host);
    const proto = host?.startsWith("localhost") ? "http" : "https";
    const origin = `${proto}://${host}`;

    let session: StripeSession;
    try {
      session = await stripePost<StripeSession>(
        "/v1/checkout/sessions",
        {
          mode: "payment",
          success_url: `${origin}/ruleta?stars=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/ruleta?stars=cancel`,
          ...(email && { customer_email: email }),
          metadata: {
            package_id: pkg.id,
            tokens: String(pkg.tokens),
            subject_email: email ?? "",
            subject_user_id: userId ?? "",
            kind: "stars_purchase",
          },
          payment_intent_data: {
            description: `HAZOREX — ${pkg.tokens} Estrellas (${pkg.label})`,
            metadata: {
              package_id: pkg.id,
              tokens: String(pkg.tokens),
              kind: "stars_purchase",
            },
          },
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: "usd",
                unit_amount: Math.round(pkg.priceUsd * 100),
                product_data: {
                  name: `${pkg.tokens} Estrellas — HAZOREX ORIGEN`,
                  description: `Paquete ${pkg.label} de Estrellas.`,
                },
              },
            },
          ],
        },
        env,
      );
    } catch (e) {
      console.error("[stars-checkout] stripe error", e);
      throw new Error("No se pudo iniciar el checkout. Inténtalo de nuevo.");
    }

    // Record pending purchase
    await supabaseAdmin.from("star_purchases").insert({
      stripe_session_id: session.id,
      package_id: pkg.id,
      tokens: pkg.tokens,
      amount_usd: pkg.priceUsd,
      subject_user_id: userId,
      subject_email: email,
      environment: env,
      status: "pending",
    });

    return { url: session.url };
  });

export const getPrizePool = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.rpc("get_prize_pool");
  if (error) {
    console.error("[prize-pool] rpc error", error);
    return { total_pool_usd: 0, total_contributions: 0, last_updated: new Date().toISOString() };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return {
    total_pool_usd: Number(row?.total_pool_usd ?? 0),
    total_contributions: Number(row?.total_contributions ?? 0),
    last_updated: row?.last_updated ?? new Date().toISOString(),
  };
});
