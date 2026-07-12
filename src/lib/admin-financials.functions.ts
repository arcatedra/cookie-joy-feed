import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type FinancialBreakdownRow = {
  bucket: string; // ISO date (YYYY-MM-DD) or YYYY-MM
  contributions: number;
  total_collected_usd: number;
  prize_pool_share_usd: number;
  platform_share_usd: number;
  prizes_paid_usd: number;
};

export type FinancialBreakdown = {
  totals: {
    contributions: number;
    total_collected_usd: number;
    prize_pool_share_usd: number;
    platform_share_usd: number;
    prizes_paid_usd: number;
    unpaid_prize_pool_usd: number;
  };
  daily: FinancialBreakdownRow[];
  monthly: FinancialBreakdownRow[];
};

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("FORBIDDEN");
}

export const getAdminFinancialBreakdown = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FinancialBreakdown> => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Pull all ledger rows (bounded by real transaction volume; add pagination if needed later).
    const { data: ledger, error: ledgerErr } = await supabaseAdmin
      .from("prize_pool_ledger")
      .select("amount_usd, pool_share_usd, platform_share_usd, created_at")
      .order("created_at", { ascending: false });
    if (ledgerErr) throw new Error(ledgerErr.message);

    // Prizes paid = winner_claims where status = 'paid'
    const { data: paidClaims, error: paidErr } = await supabaseAdmin
      .from("winner_claims")
      .select("prize_usd, paid_at, draw_date")
      .eq("status", "paid");
    if (paidErr) throw new Error(paidErr.message);

    const dailyMap = new Map<string, FinancialBreakdownRow>();
    const monthlyMap = new Map<string, FinancialBreakdownRow>();

    const bump = (
      map: Map<string, FinancialBreakdownRow>,
      key: string,
      patch: Partial<FinancialBreakdownRow>,
    ) => {
      const row =
        map.get(key) ??
        ({
          bucket: key,
          contributions: 0,
          total_collected_usd: 0,
          prize_pool_share_usd: 0,
          platform_share_usd: 0,
          prizes_paid_usd: 0,
        } satisfies FinancialBreakdownRow);
      row.contributions += patch.contributions ?? 0;
      row.total_collected_usd += patch.total_collected_usd ?? 0;
      row.prize_pool_share_usd += patch.prize_pool_share_usd ?? 0;
      row.platform_share_usd += patch.platform_share_usd ?? 0;
      row.prizes_paid_usd += patch.prizes_paid_usd ?? 0;
      map.set(key, row);
    };

    const totals = {
      contributions: 0,
      total_collected_usd: 0,
      prize_pool_share_usd: 0,
      platform_share_usd: 0,
      prizes_paid_usd: 0,
      unpaid_prize_pool_usd: 0,
    };

    for (const r of ledger ?? []) {
      const created = new Date(r.created_at as string);
      // Bucket by ET calendar day to match draw semantics
      const etDate = new Date(created.toLocaleString("en-US", { timeZone: "America/New_York" }));
      const y = etDate.getFullYear();
      const m = String(etDate.getMonth() + 1).padStart(2, "0");
      const d = String(etDate.getDate()).padStart(2, "0");
      const dayKey = `${y}-${m}-${d}`;
      const monthKey = `${y}-${m}`;
      const amount = Number(r.amount_usd ?? 0);
      const pool = Number(r.pool_share_usd ?? 0);
      const platform = Number(r.platform_share_usd ?? 0);
      const patch = {
        contributions: 1,
        total_collected_usd: amount,
        prize_pool_share_usd: pool,
        platform_share_usd: platform,
      };
      bump(dailyMap, dayKey, patch);
      bump(monthlyMap, monthKey, patch);
      totals.contributions += 1;
      totals.total_collected_usd += amount;
      totals.prize_pool_share_usd += pool;
      totals.platform_share_usd += platform;
    }

    for (const c of paidClaims ?? []) {
      const drawDate = (c.draw_date as string) ?? null;
      const prize = Number(c.prize_usd ?? 0);
      if (!drawDate) continue;
      const monthKey = drawDate.slice(0, 7);
      bump(dailyMap, drawDate, { prizes_paid_usd: prize });
      bump(monthlyMap, monthKey, { prizes_paid_usd: prize });
      totals.prizes_paid_usd += prize;
    }

    totals.unpaid_prize_pool_usd = Math.max(
      totals.prize_pool_share_usd - totals.prizes_paid_usd,
      0,
    );

    const round = (r: FinancialBreakdownRow) => ({
      ...r,
      total_collected_usd: Math.round(r.total_collected_usd * 100) / 100,
      prize_pool_share_usd: Math.round(r.prize_pool_share_usd * 100) / 100,
      platform_share_usd: Math.round(r.platform_share_usd * 100) / 100,
      prizes_paid_usd: Math.round(r.prizes_paid_usd * 100) / 100,
    });

    return {
      totals: {
        contributions: totals.contributions,
        total_collected_usd: Math.round(totals.total_collected_usd * 100) / 100,
        prize_pool_share_usd: Math.round(totals.prize_pool_share_usd * 100) / 100,
        platform_share_usd: Math.round(totals.platform_share_usd * 100) / 100,
        prizes_paid_usd: Math.round(totals.prizes_paid_usd * 100) / 100,
        unpaid_prize_pool_usd: Math.round(totals.unpaid_prize_pool_usd * 100) / 100,
      },
      daily: Array.from(dailyMap.values())
        .map(round)
        .sort((a, b) => (a.bucket < b.bucket ? 1 : -1)),
      monthly: Array.from(monthlyMap.values())
        .map(round)
        .sort((a, b) => (a.bucket < b.bucket ? 1 : -1)),
    };
  });
