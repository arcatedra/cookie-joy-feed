/**
 * Hazorex — Wallet + retiros instantáneos (Stripe Connect Express) para repartidores.
 *
 * Fuente de fondos: `delivery_routes.fixed_pay` acreditado automáticamente por
 * trigger cuando la ruta pasa a `completada`.
 *
 * Tablas: `driver_wallets`, `wallet_transactions`, `driver_payouts`.
 * Stripe: cuenta Express por repartidor (`drivers.stripe_account_id`),
 * transferencia plataforma → cuenta conectada, e Instant Payout a débito.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Comisión Stripe Instant Payouts (paga el repartidor)
const INSTANT_FEE_RATE = 0.015; // 1.5%
const INSTANT_FEE_FIXED = 0.5; // $0.50
const MIN_PAYOUT = 10;

function computeFee(amount: number): number {
  const raw = amount * INSTANT_FEE_RATE + INSTANT_FEE_FIXED;
  return Math.ceil(raw * 100) / 100;
}

export const getRouteWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Wallet cache (upsert vacío si no existe)
    const db = supabase as any;
    let { data: wallet } = await db
      .from("driver_wallets")
      .select("*")
      .eq("driver_id", userId)
      .maybeSingle();

    if (!wallet) {
      wallet = {
        driver_id: userId,
        available_balance: 0,
        pending_balance: 0,
        lifetime_earnings: 0,
        updated_at: new Date().toISOString(),
      };
    }

    const { data: driver } = await supabase
      .from("drivers")
      .select("stripe_account_id, stripe_payouts_enabled")
      .eq("id", userId)
      .maybeSingle();

    const { data: transactions } = await db
      .from("wallet_transactions")
      .select("*")
      .eq("driver_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: payouts } = await db
      .from("driver_payouts")
      .select("*")
      .eq("driver_id", userId)
      .order("requested_at", { ascending: false })
      .limit(20);

    const hasPendingPayout = (payouts ?? []).some(
      (p: any) => p.status === "procesando",
    );

    return {
      wallet: {
        available_balance: Number(wallet.available_balance),
        pending_balance: Number(wallet.pending_balance),
        lifetime_earnings: Number(wallet.lifetime_earnings),
      },
      stripe: {
        connected: !!driver?.stripe_account_id,
        payouts_enabled: !!driver?.stripe_payouts_enabled,
      },
      transactions: transactions ?? [],
      payouts: payouts ?? [],
      constants: {
        min_payout: MIN_PAYOUT,
        fee_rate: INSTANT_FEE_RATE,
        fee_fixed: INSTANT_FEE_FIXED,
      },
      hasPendingPayout,
    };
  });

// ---------- Stripe Connect onboarding ----------

export const createStripeConnectOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { return_url: string; refresh_url: string }) => ({
    return_url: z.string().url().parse(d.return_url),
    refresh_url: z.string().url().parse(d.refresh_url),
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId, claims } = context;
    const { stripePost, paymentsEnvironmentForHost } = await import(
      "@/lib/stripe.server"
    );
    const env = paymentsEnvironmentForHost(new URL(data.return_url).host);

    // Cargar o crear cuenta Express
    const { data: driver } = await supabase
      .from("drivers")
      .select("stripe_account_id, full_name")
      .eq("id", userId)
      .maybeSingle();

    let accountId = driver?.stripe_account_id as string | null;

    if (!accountId) {
      const account = await stripePost<{ id: string }>(
        "/v1/accounts",
        {
          type: "express",
          email: (claims as any)?.email,
          capabilities: {
            transfers: { requested: true },
            card_payments: { requested: true },
          },
          business_type: "individual",
          metadata: { driver_id: userId },
        },
        env,
      );
      accountId = account.id;
      const dbAny = supabase as any;
      await dbAny
        .from("drivers")
        .update({
          stripe_account_id: accountId,
          stripe_onboarding_status: "pendiente",
          stripe_updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
    }

    const link = await stripePost<{ url: string }>(
      "/v1/account_links",
      {
        account: accountId,
        return_url: data.return_url,
        refresh_url: data.refresh_url,
        type: "account_onboarding",
      },
      env,
    );

    return { url: link.url, accountId };
  });

export const refreshStripeConnectStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { stripeGet, paymentsEnvironmentForHost } = await import(
      "@/lib/stripe.server"
    );

    const { data: driver } = await supabase
      .from("drivers")
      .select("stripe_account_id")
      .eq("id", userId)
      .maybeSingle();

    if (!driver?.stripe_account_id) {
      return { connected: false, payouts_enabled: false };
    }

    const env = paymentsEnvironmentForHost();
    const acct = await stripeGet<{
      payouts_enabled?: boolean;
      charges_enabled?: boolean;
      details_submitted?: boolean;
    }>(`/v1/accounts/${driver.stripe_account_id}`, env);

    const payoutsEnabled = !!acct.payouts_enabled;
    const chargesEnabled = !!acct.charges_enabled;
    const detailsSubmitted = !!acct.details_submitted;
    const status: "pendiente" | "completo" =
      payoutsEnabled && chargesEnabled && detailsSubmitted ? "completo" : "pendiente";

    const dbAny = supabase as any;
    await dbAny
      .from("drivers")
      .update({
        stripe_payouts_enabled: payoutsEnabled,
        stripe_onboarding_status: status,
        stripe_updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    return {
      connected: true,
      payouts_enabled: payoutsEnabled,
      charges_enabled: chargesEnabled,
      details_submitted: detailsSubmitted,
      onboarding_status: status,
    };
  });

// ---------- Solicitar retiro instantáneo ----------

export const requestRoutePayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { amount: number }) => ({
    amount: z.number().positive().max(10000).parse(d.amount),
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const dbAny = supabase as any;
    const { stripePost, paymentsEnvironmentForHost } = await import(
      "@/lib/stripe.server"
    );

    const amount = Math.round(data.amount * 100) / 100;
    if (amount < MIN_PAYOUT) {
      throw new Error(`El monto mínimo de retiro es $${MIN_PAYOUT.toFixed(2)}`);
    }

    // Verificar Stripe Connect
    const { data: driver } = await supabase
      .from("drivers")
      .select("stripe_account_id, stripe_payouts_enabled")
      .eq("id", userId)
      .maybeSingle();

    if (!driver?.stripe_account_id || !driver.stripe_payouts_enabled) {
      throw new Error(
        "Tu cuenta bancaria no está conectada. Completa la configuración de Stripe primero.",
      );
    }

    const fee = computeFee(amount);
    const net = Math.round((amount - fee) * 100) / 100;
    if (net <= 0) {
      throw new Error("El monto es demasiado bajo para cubrir la comisión");
    }

    // Reservar fondos vía RPC (bloquea saldo y crea driver_payouts en 'procesando')
    const { data: payout, error: rpcErr } = await dbAny.rpc(
      "request_driver_payout",
      { p_amount: amount, p_fee: fee },
    );
    if (rpcErr) throw new Error(rpcErr.message);

    const payoutRow: any = Array.isArray(payout) ? payout[0] : payout;
    const env = paymentsEnvironmentForHost();
    const amountCents = Math.round(net * 100);

    try {
      // 1) Transferir de la plataforma a la cuenta conectada
      await stripePost(
        "/v1/transfers",
        {
          amount: amountCents,
          currency: "usd",
          destination: driver.stripe_account_id,
          transfer_group: `payout_${payoutRow.id}`,
          metadata: { payout_id: payoutRow.id, driver_id: userId },
        },
        env,
      );

      // 2) Instant Payout desde la cuenta conectada hacia su débito
      const stripePayout = await stripePost<{ id: string }>(
        "/v1/payouts",
        {
          amount: amountCents,
          currency: "usd",
          method: "instant",
          metadata: { payout_id: payoutRow.id, driver_id: userId },
        },
        env,
        { "Stripe-Account": driver.stripe_account_id },
      );

      // Marcar completado
      const { error: cErr } = await dbAny.rpc("complete_driver_payout", {
        p_payout_id: payoutRow.id,
        p_stripe_payout_id: stripePayout.id,
      });
      if (cErr) throw new Error(cErr.message);

      return {
        ok: true as const,
        payout_id: payoutRow.id,
        amount_net: net,
        fee,
      };
    } catch (err: any) {
      // Reversión: devolver saldo
      await dbAny.rpc("reverse_failed_payout", {
        p_payout_id: payoutRow.id,
        p_reason: (err?.message ?? "Error desconocido").slice(0, 300),
      });
      throw new Error(`No se pudo procesar el retiro: ${err?.message ?? err}`);
    }
  });

// ---------- Admin ----------

export const adminListRoutePayouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const dbAny = supabase as any;

    const { data: isAdmin } = await dbAny.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Solo admins");

    const { data: payouts } = await dbAny
      .from("driver_payouts")
      .select("*, drivers(full_name, stripe_account_id)")
      .order("requested_at", { ascending: false })
      .limit(100);

    const { data: wallets } = await dbAny
      .from("driver_wallets")
      .select("available_balance");

    const totalPending = (wallets ?? []).reduce(
      (s: number, w: any) => s + Number(w.available_balance),
      0,
    );

    return {
      payouts: payouts ?? [],
      totalPending,
    };
  });

/**
 * Sincronización manual de un payout: consulta Stripe y actualiza el estado
 * local. Sirve de respaldo si el webhook falla o llega tarde.
 */
export const adminSyncRoutePayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { payout_id: string }) => ({
    payout_id: z.string().uuid().parse(d.payout_id),
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const dbAny = supabase as any;

    const { data: isAdmin } = await dbAny.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Solo admins");

    const { data: payout } = await dbAny
      .from("driver_payouts")
      .select("id, status, stripe_payout_id, driver_id")
      .eq("id", data.payout_id)
      .maybeSingle();

    if (!payout) throw new Error("Retiro no encontrado");
    if (!payout.stripe_payout_id) {
      throw new Error("Este retiro nunca llegó a Stripe (sin stripe_payout_id)");
    }

    const { data: driver } = await dbAny
      .from("drivers")
      .select("stripe_account_id")
      .eq("id", payout.driver_id)
      .maybeSingle();

    if (!driver?.stripe_account_id) {
      throw new Error("Repartidor sin cuenta de Stripe conectada");
    }

    const { stripeGet, paymentsEnvironmentForHost } = await import(
      "@/lib/stripe.server"
    );
    const env = paymentsEnvironmentForHost();

    const remote = await stripeGet<{
      id: string;
      status: string;
      failure_message?: string | null;
      failure_code?: string | null;
    }>(`/v1/payouts/${payout.stripe_payout_id}`, env, {
      "Stripe-Account": driver.stripe_account_id,
    });

    // Estados de Stripe: paid | pending | in_transit | canceled | failed
    if (remote.status === "paid") {
      if (payout.status !== "completado") {
        await dbAny.rpc("complete_driver_payout", {
          p_payout_id: payout.id,
          p_stripe_payout_id: remote.id,
        });
      }
      return { updated: payout.status !== "completado", status: "completado" };
    }

    if (remote.status === "failed" || remote.status === "canceled") {
      if (payout.status !== "fallido") {
        await dbAny.rpc("reverse_failed_payout", {
          p_payout_id: payout.id,
          p_reason: (remote.failure_message ?? remote.failure_code ?? remote.status).slice(0, 300),
        });
      }
      return { updated: payout.status !== "fallido", status: "fallido" };
    }

    // pending / in_transit → sigue procesando
    return { updated: false, status: "procesando", remote_status: remote.status };
  });

