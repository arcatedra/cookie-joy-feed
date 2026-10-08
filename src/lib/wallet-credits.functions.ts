/**
 * Saldo del usuario (bonos de referido). Solo se descuenta en compras.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestHost } from "@tanstack/react-start/server";
import { withdrawalRequestSchema } from "./withdrawal-destination";

export const getMyCredit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = context.supabase;
    const { paymentsEnvironmentForHost } = await import("./stripe.server");
    const environment = paymentsEnvironmentForHost(getRequestHost());
    const [{ data: balance, error: balanceError }, { data: movements, error: movementsError }, { data: withdrawals, error: withdrawalsError }, { data: rewards, error: rewardsError }] = await Promise.all([
      db.rpc("credit_balance_for_environment", { p_environment: environment }),
      db
        .from("wallet_credits")
        .select("id, amount_usd, reason, created_at")
        .eq("user_id", context.userId)
        .eq("stripe_environment", environment)
        .order("created_at", { ascending: false })
        .limit(100),
      db.from("withdrawal_requests").select("id, amount_usd, status, created_at, updated_at, payout_method, payout_identifier").eq("profile_id", context.userId).eq("source", "referral").eq("stripe_environment", environment).order("created_at", { ascending: false }).limit(100),
      db.from("referral_rewards").select("id, amount_usd, status, created_at").eq("referrer_id", context.userId).eq("stripe_environment", environment).order("created_at", { ascending: false }).limit(100),
    ]);
    if (balanceError || movementsError || withdrawalsError || rewardsError) throw new Error("No se pudo consultar tu saldo.");
    return {
      environment,
      withdrawals: withdrawals ?? [],
      rewards: rewards ?? [],
      balance: Number(balance ?? 0),
      movements: (movements ?? []) as Array<{
        id: string;
        amount_usd: number;
        reason: string;
        created_at: string;
      }>,
    };
  });

export const requestCreditWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => withdrawalRequestSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { paymentsEnvironmentForHost } = await import("./stripe.server");
    const environment = paymentsEnvironmentForHost(getRequestHost());
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: id, error } = await supabaseAdmin.rpc("request_wallet_withdrawal_to_destination", { p_user: context.userId, p_amount: data.amount, p_environment: environment, p_method: data.payoutMethod, p_identifier: data.payoutIdentifier });
    if (error) throw new Error("No se pudo solicitar el retiro. Comprueba tu saldo e inténtalo de nuevo.");
    return { id, environment };
  });
