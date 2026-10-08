import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listCreditWithdrawalsForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (error || isAdmin !== true) throw new Error("Solo administradores.");
    const [{ data: rows, error: listError }, { data: details, error: detailsError }] = await Promise.all([
      context.supabase.rpc("admin_list_withdrawals"),
      context.supabase.from("withdrawal_requests").select("id,source,stripe_environment,payout_method,payout_identifier").order("created_at", { ascending: false }).limit(1000),
    ]);
    if (listError || detailsError) throw new Error("No se pudieron consultar los retiros.");
    const byId = new Map((details ?? []).map((row) => [row.id, row]));
    return (rows ?? []).map((row: { id: string; profile_id: string; amount_usd: number; status: string; notes: string | null; created_at: string; updated_at: string; affiliate_name: string | null; affiliate_email: string | null }) => ({ ...row, source: byId.get(row.id)?.source ?? "affiliate", stripe_environment: byId.get(row.id)?.stripe_environment ?? null, payout_method: byId.get(row.id)?.payout_method ?? null, payout_identifier: byId.get(row.id)?.payout_identifier ?? null }));
  });