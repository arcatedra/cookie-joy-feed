export type DrawRow = {
  draw_date: string;
  status: string;
  prize_usd: number | string | null;
  entrants_total: number | null;
  seed_hash: string | null;
  drawn_at: string | null;
};

export type WinnerRow = {
  draw_date: string;
  winner_display_name: string | null;
  seed_hash: string | null;
  published_at: string;
  prize_usd: number | string | null;
};

export type DrawHistoryEntry = {
  drawDate: string;
  status: string;
  winnerDisplayName: string | null;
  prizeUsd: number;
  entrantsTotal: number;
  seedHash: string | null;
  drawnAt: string | null;
  hasWinner: boolean;
  noParticipants: boolean;
};

/**
 * Merge daily_draws rows with winner_announcements into a single history list.
 * Every daily_draws row produces exactly one entry so no dates are dropped.
 */
export function buildDrawHistory(draws: DrawRow[], winners: WinnerRow[]): DrawHistoryEntry[] {
  const wMap = new Map<string, WinnerRow>();
  for (const w of winners) wMap.set(w.draw_date, w);

  return draws.map((d) => {
    const w = wMap.get(d.draw_date);
    const entrantsTotal = Number(d.entrants_total ?? 0);
    const hasWinner = !!w?.winner_display_name && d.status === "completed";
    return {
      drawDate: d.draw_date,
      status: d.status,
      winnerDisplayName: w?.winner_display_name ?? null,
      prizeUsd: w ? Number(w.prize_usd ?? 0) : Number(d.prize_usd ?? 0),
      entrantsTotal,
      seedHash: w?.seed_hash ?? d.seed_hash ?? null,
      drawnAt: w?.published_at ?? d.drawn_at ?? null,
      hasWinner,
      noParticipants: entrantsTotal === 0,
    };
  });
}

/**
 * Return every ISO date (YYYY-MM-DD) between `startISO` and `endISO`, inclusive.
 * Used to assert the history has no missing days.
 */
export function enumerateDateRange(startISO: string, endISO: string): string[] {
  const out: string[] = [];
  const start = new Date(startISO + "T12:00:00Z");
  const end = new Date(endISO + "T12:00:00Z");
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}
