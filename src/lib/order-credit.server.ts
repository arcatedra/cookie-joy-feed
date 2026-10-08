import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { StripeEnv } from "./stripe.server";

/** All mutations are serialized in Postgres; never calculate spendable funds in the browser. */
export async function reserveOrderCredit(db: SupabaseClient<Database>, kind: "store" | "cookie", orderId: string, limitCents: number, environment: StripeEnv) {
  const { data, error } = await db.rpc("reserve_order_credit", { p_kind: kind, p_order: orderId, p_limit: Math.max(0, limitCents) / 100, p_environment: environment });
  if (error) throw new Error("No se pudo apartar tu saldo. Inténtalo de nuevo.");
  return Math.round(Number(data ?? 0) * 100);
}

export async function releaseOrderCredit(db: SupabaseClient<Database>, kind: "store" | "cookie", orderId: string) {
  const { error } = await db.rpc("release_order_credit", { p_kind: kind, p_order: orderId });
  if (error) throw new Error("No se pudo devolver el saldo del pedido cancelado.");
}