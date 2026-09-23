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
  stripe_onboarding_status: string;
  stripe_payouts_enabled: boolean;
};

async function myBusiness(db: any, userId: string): Promise<Business> {
  const { data, error } = await db
    .from("businesses")
    .select(
      "id, business_name, email, stripe_account_id, stripe_onboarding_status, stripe_payouts_enabled",
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

    const { paymentsEnvironmentForHost, stripeGet } = await import("./stripe.server");
    const env = paymentsEnvironmentForHost(getRequestHost());
    let payoutsEnabled = biz.stripe_payouts_enabled;
    let detailsSubmitted = biz.stripe_onboarding_status === "complete";
    try {
      const acct = await stripeGet<any>(`/v1/accounts/${biz.stripe_account_id}`, env);
      payoutsEnabled = Boolean(acct?.payouts_enabled);
      detailsSubmitted = Boolean(acct?.details_submitted);
      const status = payoutsEnabled && detailsSubmitted ? "complete" : "pending";
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await (supabaseAdmin as any)
        .from("businesses")
        .update({ stripe_onboarding_status: status, stripe_payouts_enabled: payoutsEnabled })
        .eq("id", biz.id);
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

    const { paymentsEnvironmentForHost, stripePost } = await import("./stripe.server");
    const env = paymentsEnvironmentForHost(getRequestHost());
    const host = getRequestHost() ?? "hazorex.com";
    const origin = host.includes("localhost") ? `http://${host}` : `https://${host}`;
    const backTo = `${origin}${data.returnPath ?? "/negocios/cobros"}`;

    let accountId = biz.stripe_account_id;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (!accountId) {
      const acct = await stripePost<any>(
        "/v1/accounts",
        {
          type: "express",
          email: biz.email,
          business_profile: { name: biz.business_name },
          capabilities: {
            transfers: { requested: true },
            card_payments: { requested: true },
          },
          metadata: { business_id: biz.id },
        },
        env,
        { "Idempotency-Key": `connect-account-${biz.id}` },
      );
      accountId = acct?.id as string;
      if (!accountId) throw new Error("No se pudo crear la cuenta de cobro.");
      await (supabaseAdmin as any)
        .from("businesses")
        .update({ stripe_account_id: accountId, stripe_onboarding_status: "pending" })
        .eq("id", biz.id);
    }

    const link = await stripePost<any>(
      "/v1/account_links",
      {
        account: accountId,
        refresh_url: backTo,
        return_url: backTo,
        type: "account_onboarding",
      },
      env,
    );
    if (!link?.url) throw new Error("No se pudo generar el enlace de registro.");
    return { url: link.url as string };
  });
