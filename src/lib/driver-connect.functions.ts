/**
 * Cuenta de cobro (Stripe Connect Express) de cada repartidor aprobado.
 * Sus datos bancarios los pone él en Stripe; Hazorex nunca los ve.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Driver = {
  id: string;
  full_name: string;
  email: string;
  application_status: string;
  stripe_account_id: string | null;
  stripe_onboarding_status: string;
  stripe_payouts_enabled: boolean;
};

async function myDriver(db: any, userId: string): Promise<Driver> {
  const { data, error } = await db
    .from("drivers")
    .select(
      "id, full_name, email, application_status, stripe_account_id, stripe_onboarding_status, stripe_payouts_enabled",
    )
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("No tienes una postulación de repartidor.");
  return data as Driver;
}

/** Estado de la cuenta de cobro del repartidor + sus pagos. */
export const getDriverConnectStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = (context as any).supabase;
    const userId = (context as any).userId as string;
    const drv = await myDriver(db, userId);

    let payoutsEnabled = drv.stripe_payouts_enabled;
    let detailsSubmitted = drv.stripe_onboarding_status === "complete";

    if (drv.stripe_account_id) {
      const { paymentsEnvironmentForHost, stripeGet } = await import("./stripe.server");
      const env = paymentsEnvironmentForHost(getRequestHost());
      try {
        const acct = await stripeGet<any>(`/v1/accounts/${drv.stripe_account_id}`, env);
        payoutsEnabled = Boolean(acct?.payouts_enabled);
        detailsSubmitted = Boolean(acct?.details_submitted);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await (supabaseAdmin as any)
          .from("drivers")
          .update({
            stripe_onboarding_status: payoutsEnabled && detailsSubmitted ? "complete" : "pending",
            stripe_payouts_enabled: payoutsEnabled,
          })
          .eq("id", drv.id);
      } catch (e) {
        console.error("[driver-connect] no se pudo leer la cuenta", e);
      }
    }

    const { data: payouts } = await db
      .from("driver_payouts")
      .select("id, amount_usd, tier_amount_usd, weight_amount_usd, tip_amount_usd, status, created_at, paid_at")
      .eq("driver_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    const rows = payouts ?? [];
    const sum = (f: (r: any) => boolean) =>
      Math.round(rows.filter(f).reduce((s: number, r: any) => s + Number(r.amount_usd ?? 0), 0) * 100) /
      100;

    return {
      driverName: drv.full_name,
      approved: drv.application_status === "aprobado",
      status: (!drv.stripe_account_id
        ? "none"
        : payoutsEnabled && detailsSubmitted
          ? "complete"
          : "pending") as "none" | "pending" | "complete",
      payoutsEnabled,
      detailsSubmitted,
      payouts: rows,
      totalPagado: sum((r: any) => r.status === "pagado"),
      totalPendiente: sum((r: any) => r.status !== "pagado"),
    };
  });

/** Crea (si hace falta) la cuenta Express y devuelve el enlace de registro. */
export const createDriverAccountLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ returnPath: z.string().max(200).optional() }).parse(raw ?? {}))
  .handler(async ({ data, context }) => {
    const db = (context as any).supabase;
    const drv = await myDriver(db, (context as any).userId);
    if (drv.application_status !== "aprobado") {
      throw new Error("Tu postulación todavía no está aprobada.");
    }

    const { paymentsEnvironmentForHost, stripePost } = await import("./stripe.server");
    const env = paymentsEnvironmentForHost(getRequestHost());
    const host = getRequestHost() ?? "hazorex.com";
    const origin = host.includes("localhost") ? `http://${host}` : `https://${host}`;
    const backTo = `${origin}${data.returnPath ?? "/repartidor/cobros"}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let accountId = drv.stripe_account_id;

    if (!accountId) {
      const acct = await stripePost<any>(
        "/v1/accounts",
        {
          type: "express",
          email: drv.email,
          business_type: "individual",
          capabilities: { transfers: { requested: true } },
          metadata: { driver_id: drv.id },
        },
        env,
        { "Idempotency-Key": `driver-account-${drv.id}` },
      );
      accountId = acct?.id as string;
      if (!accountId) throw new Error("No se pudo crear la cuenta de cobro.");
      await (supabaseAdmin as any)
        .from("drivers")
        .update({ stripe_account_id: accountId, stripe_onboarding_status: "pending" })
        .eq("id", drv.id);
    }

    const link = await stripePost<any>(
      "/v1/account_links",
      { account: accountId, refresh_url: backTo, return_url: backTo, type: "account_onboarding" },
      env,
    );
    if (!link?.url) throw new Error("No se pudo generar el enlace de registro.");
    return { url: link.url as string };
  });
