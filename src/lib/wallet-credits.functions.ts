/**
 * Saldo del usuario (bonos de referido). Solo se descuenta en compras.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyCredit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = (context as any).supabase;
    const [{ data: balance }, { data: movements }] = await Promise.all([
      db.rpc("get_my_credit_balance"),
      db
        .from("wallet_credits")
        .select("id, amount_usd, reason, created_at")
        .order("created_at", { ascending: false })
        .limit(25),
    ]);
    return {
      balance: Number(balance ?? 0),
      movements: (movements ?? []) as Array<{
        id: string;
        amount_usd: number;
        reason: string;
        created_at: string;
      }>,
    };
  });
