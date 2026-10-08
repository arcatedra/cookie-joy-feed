/** Atomic reward on actual capture, shared between store and cookie orders. */
export async function grantReferralRewardForOrder(orderId: string, kind: "store" | "cookie" = "store"): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const table = kind === "store" ? "store_orders" : "pedidos";
  const { data: order, error } = await supabaseAdmin.from(table).select("stripe_environment,monto_capturado").eq("id", orderId).maybeSingle();
  if (error) throw new Error("No se pudo verificar el cobro para el bono.");
  if (!order || Number(order.monto_capturado ?? 0) <= 0) return;
  const environment = order.stripe_environment;
  if (environment !== "sandbox" && environment !== "live") return;
  const { error: rewardError } = await supabaseAdmin.rpc("grant_captured_referral", { p_kind: kind, p_order: orderId, p_environment: environment });
  if (rewardError) throw new Error("No se pudo registrar el bono de referido.");
}
