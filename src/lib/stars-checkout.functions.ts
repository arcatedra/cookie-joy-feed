import { createServerFn } from "@tanstack/react-start";
import { getRequestHost, getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { TOKEN_PACKAGES } from "./roulette-config";

const US_STATE = z.string().trim().length(2).regex(/^[A-Za-z]{2}$/, "Estado inválido");
const DOB = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de nacimiento inválida");

const schema = z.object({
  packageId: z.enum(["stars_starter", "stars_popular", "stars_premium"]),
  email: z.string().trim().email().max(255).optional(),
  dob: DOB,
  state: US_STATE,
});

function yearsBetween(dobIso: string, now: Date): number {
  const dob = new Date(`${dobIso}T00:00:00Z`);
  if (Number.isNaN(dob.getTime())) return -1;
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const mo = now.getUTCMonth() - dob.getUTCMonth();
  if (mo < 0 || (mo === 0 && now.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age;
}

interface StripeSession {
  id: string;
  url: string;
}

export const createStarsCheckout = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    const pkg = TOKEN_PACKAGES.find((p) => p.id === data.packageId);
    if (!pkg) throw new Error("Paquete inválido");

    // --- Age + state gate (authoritative, server-side) ---
    const declaredState = data.state.toUpperCase();

    // Load excluded states + min age from sweepstakes_config (single source of truth).
    let excludedStates: string[] = ["FL", "RI"];
    let minAge = 18;
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const sbCfg = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      });
      const { data: cfg } = await sbCfg.rpc("get_sweepstakes_public_config");
      const row = Array.isArray(cfg) ? cfg[0] : cfg;
      if (row?.excluded_states) excludedStates = (row.excluded_states as string[]).map((s) => s.toUpperCase());
      if (row?.min_age) minAge = Number(row.min_age);
    } catch (e) {
      console.warn("[stars-checkout] could not load sweepstakes_config, using defaults", e);
    }

    const age = yearsBetween(data.dob, new Date());
    if (age < 0) throw new Error("Fecha de nacimiento inválida.");
    if (age < minAge) {
      throw new Error(`Debes tener al menos ${minAge} años para comprar Estrellas.`);
    }

    if (excludedStates.includes(declaredState)) {
      throw new Error("Lo sentimos, la compra de Estrellas no está disponible en tu estado.");
    }

    // Defense-in-depth: block by Cloudflare geo headers when available.
    try {
      const req = getRequest();
      const cfCountry = req?.headers.get("cf-ipcountry")?.toUpperCase() ?? null;
      const cfRegion = req?.headers.get("cf-region-code")?.toUpperCase() ?? null;
      if (cfCountry && cfCountry !== "US" && cfCountry !== "XX" && cfCountry !== "T1") {
        throw new Error("El sorteo diario solo está disponible para residentes de EE. UU.");
      }
      if (cfRegion && excludedStates.includes(cfRegion)) {
        throw new Error("Lo sentimos, la compra de Estrellas no está disponible en tu estado.");
      }
    } catch (e) {
      // Rethrow explicit blocks; ignore missing-header cases.
      if (e instanceof Error && /disponible/.test(e.message)) throw e;
    }

    // Resolve subject — bearer user OR HMAC-verified guest email cookie.
    const { verifyGuestCookie } = await import("./guest-cookie.server");
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
      const guestEmail = verifyGuestCookie();
      if (guestEmail) email = email ?? guestEmail;
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
            attested_dob: data.dob,
            attested_state: declaredState,
            attested_age: String(age),
          },
          payment_intent_data: {
            description: `HAZOREX — ${pkg.tokens} Estrellas (${pkg.id})`,
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
                  name: `${pkg.tokens} Estrellas — HAZOREX`,
                  description: `Paquete ${pkg.id} de Estrellas.`,
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
  const fallback = { total_pool_usd: 0, total_contributions: 0, last_updated: new Date().toISOString() };
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      console.error("[prize-pool] missing SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY");
      return fallback;
    }
    const sb = createClient(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await sb.rpc("get_prize_pool");
    if (error) {
      console.error("[prize-pool] rpc error", error);
      return fallback;
    }
    const row = Array.isArray(data) ? data[0] : data;
    return {
      total_pool_usd: Number(row?.total_pool_usd ?? 0),
      total_contributions: Number(row?.total_contributions ?? 0),
      last_updated: row?.last_updated ?? new Date().toISOString(),
    };
  } catch (e) {
    console.error("[prize-pool] unexpected error", e);
    return fallback;
  }
});
