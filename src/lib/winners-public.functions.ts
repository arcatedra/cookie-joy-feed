import { createServerFn } from "@tanstack/react-start";

export const listPublicWinners = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb
    .from("winner_announcements")
    .select("draw_date, winner_display_name, prize_usd, seed_hash, published_at")
    .order("draw_date", { ascending: false })
    .limit(200);
  if (error) {
    console.error("[winners-public] error", error);
    return [] as Array<{
      draw_date: string;
      winner_display_name: string;
      prize_usd: number;
      seed_hash: string | null;
      published_at: string;
    }>;
  }
  return (data ?? []).map((r) => ({
    draw_date: r.draw_date as string,
    winner_display_name: (r.winner_display_name as string) ?? "",
    prize_usd: Number(r.prize_usd ?? 0),
    seed_hash: (r.seed_hash as string | null) ?? null,
    published_at: r.published_at as string,
  }));
});
