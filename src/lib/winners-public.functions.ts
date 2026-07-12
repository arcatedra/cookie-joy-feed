import { createServerFn } from "@tanstack/react-start";

export type PublicDrawHistoryEntry = {
  draw_date: string;
  status: "completed" | "rolled_over" | "open" | "closed" | "drawing";
  winner_display_name: string | null;
  prize_usd: number;
  entrants_total: number;
  seed_hash: string | null;
  published_at: string | null;
};

export const listPublicWinners = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: draws, error: drawsErr } = await supabaseAdmin
    .from("daily_draws")
    .select("draw_date, status, prize_usd, entrants_total, seed_hash, drawn_at")
    .order("draw_date", { ascending: false })
    .limit(365);

  if (drawsErr) {
    console.error("[winners-public] draws error", drawsErr);
    return [] as PublicDrawHistoryEntry[];
  }

  const { data: winners, error: winErr } = await supabaseAdmin
    .from("winner_announcements")
    .select("draw_date, winner_display_name, seed_hash, published_at, prize_usd");

  if (winErr) {
    console.error("[winners-public] winners error", winErr);
  }

  const byDate = new Map<string, { winner_display_name: string; seed_hash: string | null; published_at: string; prize_usd: number }>();
  for (const w of winners ?? []) {
    byDate.set(w.draw_date as string, {
      winner_display_name: (w.winner_display_name as string) ?? "",
      seed_hash: (w.seed_hash as string | null) ?? null,
      published_at: w.published_at as string,
      prize_usd: Number(w.prize_usd ?? 0),
    });
  }

  return (draws ?? []).map<PublicDrawHistoryEntry>((d) => {
    const win = byDate.get(d.draw_date as string);
    return {
      draw_date: d.draw_date as string,
      status: d.status as PublicDrawHistoryEntry["status"],
      winner_display_name: win?.winner_display_name ?? null,
      prize_usd: win ? win.prize_usd : Number(d.prize_usd ?? 0),
      entrants_total: Number(d.entrants_total ?? 0),
      seed_hash: win?.seed_hash ?? (d.seed_hash as string | null) ?? null,
      published_at: win?.published_at ?? (d.drawn_at as string | null) ?? null,
    };
  });
});
