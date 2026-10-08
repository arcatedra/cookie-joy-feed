/**
 * Cuentas de cobro (Stripe Connect Express) de cada negocio aliado.
 *
 * El cliente paga todo a la plataforma (separate charges and transfers) y
 * después se transfiere al negocio la parte de sus productos.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Business = {
  id: string;
  business_name: string;
  email: string;
  stripe_account_id: string | null;
  stripe_environment: "sandbox" | "live" | null;
  stripe_onboarding_status: string;
  stripe_payouts_enabled: boolean;
};

async function myBusiness(db: any, userId: string): Promise<Business> {
  const { data, error } = await db
    .from("businesses")
    .select(
      "id, business_name, email, stripe_account_id, stripe_environment, stripe_onboarding_status, stripe_payouts_enabled",
    )
    .eq("owner_user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("No tienes un negocio registrado.");
  return data as Business;
}

/** Estado de la cuenta de cobro del negocio del usuario. */
export const getConnectStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = (context as any).supabase;
    const biz = await myBusiness(db, (context as any).userId);

    if (!biz.stripe_account_id) {
      return {
        businessName: biz.business_name,
        status: "none" as const,
        payoutsEnabled: false,
        detailsSubmitted: false,
      };
    }

    const { paymentsEnvironmentForHost, getRecipientStatus } = await import("./stripe.server");
    const env = paymentsEnvironmentForHost(getRequestHost());
    if (biz.stripe_account_id && biz.stripe_environment !== env) throw new Error("Esta cuenta pertenece a otro ambiente o requiere verificar su ambiente antes de continuar.");
    let payoutsEnabled = biz.stripe_payouts_enabled;
    let detailsSubmitted = biz.stripe_onboarding_status === "complete";
    try {
      const st = await getRecipientStatus(biz.stripe_account_id, env);
      payoutsEnabled = st.transfersActive;
      detailsSubmitted = st.transfersActive && st.payoutsActive;
      const status = payoutsEnabled && detailsSubmitted ? "complete" : "pending";
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await (supabaseAdmin as any)
        .from("businesses")
        .update({ stripe_onboarding_status: status, stripe_payouts_enabled: payoutsEnabled })
        .eq("id", biz.id);
      // Al quedar lista, se envía todo lo pendiente (respaldo del webhook).
      if (payoutsEnabled && !biz.stripe_payouts_enabled) {
        const { flushBusinessPending } = await import("./payouts.server");
        await flushBusinessPending(biz.id);
      }
    } catch (e) {
      console.error("[store-connect] no se pudo leer la cuenta", e);
    }

    return {
      businessName: biz.business_name,
      status: (payoutsEnabled && detailsSubmitted ? "complete" : "pending") as
        | "complete"
        | "pending",
      payoutsEnabled,
      detailsSubmitted,
    };
  });

/**
 * Crea (si hace falta) la cuenta Express y devuelve el enlace de registro.
 */
export const createExpressAccountLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ returnPath: z.string().max(200).optional() }).parse(raw ?? {}))
  .handler(async ({ data, context }) => {
    const db = (context as any).supabase;
    const biz = await myBusiness(db, (context as any).userId);

    const { paymentsEnvironmentForHost, createRecipientAccount, createRecipientOnboardingLink } =
      await import("./stripe.server");
    const env = paymentsEnvironmentForHost(getRequestHost());
    if (biz.stripe_account_id && biz.stripe_environment !== env) throw new Error("Esta cuenta pertenece a otro ambiente o requiere verificar su ambiente antes de continuar.");
    const host = getRequestHost() ?? "hazorex.com";
    const origin = host.includes("localhost") ? `http://${host}` : `https://${host}`;
    const backTo = `${origin}${data.returnPath ?? "/negocios/cobros"}`;

    let accountId = biz.stripe_account_id;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (!accountId) {
      accountId = await createRecipientAccount(
        {
          email: biz.email,
          displayName: biz.business_name,
          entityType: "company",
          metadata: { business_id: biz.id },
        },
        env,
        `connect-v2-account-${biz.id}`,
      );
      await (supabaseAdmin as any)
        .from("businesses")
        .update({ stripe_account_id: accountId, stripe_environment: env, stripe_onboarding_status: "pending" })
        .eq("id", biz.id);
    }

    const url = await createRecipientOnboardingLink(accountId, backTo, env);
    return { url };
  });
