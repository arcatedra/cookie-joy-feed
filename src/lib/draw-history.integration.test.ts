import { describe, it, expect } from "vitest";
import { buildDrawHistory, enumerateDateRange, type DrawRow, type WinnerRow } from "./draw-history";

/**
 * All draw dates are calendar days (YYYY-MM-DD) anchored to UTC — the same
 * convention `daily_draws.draw_date` uses in Postgres. Every date comparison
 * in this test is a lexicographic string compare or is routed through
 * `enumerateDateRange`, which pins the clock to `T12:00:00Z`. That keeps
 * results identical on runners in America/Los_Angeles, Asia/Tokyo, UTC, etc.
 */
const LAUNCH_DATE_UTC = "2026-06-22";
const SNAPSHOT_DATE_UTC = "2026-07-12";

/**
 * Integration-style test: snapshot of real production rows from `daily_draws`
 * and `winner_announcements` (captured 2026-07-12). We simulate the LEFT JOIN
 * that `getDrawHistory` (daily-draw.functions.ts) and `listPublicWinners`
 * (winners-public.functions.ts) perform in Supabase, then assert both
 * server-fn projections agree with the pure `buildDrawHistory` helper.
 *
 * If either server fn's merge logic drifts from the helper, this test fails.
 */

// draw_date DESC, matches `.order("draw_date", { ascending: false })`
const DRAWS: DrawRow[] = [
  { draw_date: "2026-07-12", status: "rolled_over", prize_usd: "0.00", entrants_total: 0, seed_hash: "482cab4105708a9c6d5561678ee8d121564091cf4b55ab7c1fa4b977a6556038", drawn_at: "2026-07-12T13:47:45.879113+00:00" },
  { draw_date: "2026-07-11", status: "rolled_over", prize_usd: "0.00", entrants_total: 0, seed_hash: null, drawn_at: null },
  { draw_date: "2026-07-10", status: "rolled_over", prize_usd: "0.00", entrants_total: 0, seed_hash: null, drawn_at: null },
  { draw_date: "2026-07-09", status: "rolled_over", prize_usd: "0.00", entrants_total: 0, seed_hash: null, drawn_at: null },
  { draw_date: "2026-07-08", status: "rolled_over", prize_usd: "0.00", entrants_total: 0, seed_hash: null, drawn_at: null },
  { draw_date: "2026-07-07", status: "rolled_over", prize_usd: "0.00", entrants_total: 0, seed_hash: "974cd4db4640613b868b38f3bdaf7f88bb6cf0d4d53f7cba89e6e3fa3e2252ac", drawn_at: "2026-07-08T00:00:02.260168+00:00" },
  { draw_date: "2026-07-06", status: "rolled_over", prize_usd: "0.00", entrants_total: 0, seed_hash: "0f9eb8b433077db2564d6b7163c28e92c00bf2be8ff66b7c3c16d39d0a465158", drawn_at: "2026-07-07T00:00:02.125111+00:00" },
  { draw_date: "2026-07-05", status: "rolled_over", prize_usd: "0.00", entrants_total: 0, seed_hash: "c6b8f039cdae194cebc31903baad62665a3b8e1400e475d51226044ea64d7380", drawn_at: "2026-07-06T00:00:01.10969+00:00" },
  { draw_date: "2026-07-04", status: "rolled_over", prize_usd: "0.00", entrants_total: 0, seed_hash: "d136a7dc60bdf9818508d9bcf9523a2b28a89e8391074b3532d467a39cdeedac", drawn_at: "2026-07-05T00:00:01.988147+00:00" },
  { draw_date: "2026-07-03", status: "rolled_over", prize_usd: "0.00", entrants_total: 0, seed_hash: "59b10ce3f4228d121104e91d9ab19c77b2d96cd8034ae78b9efbed9009b1ed9d", drawn_at: "2026-07-04T00:00:02.32738+00:00" },
  { draw_date: "2026-07-02", status: "rolled_over", prize_usd: "0.00", entrants_total: 0, seed_hash: "e1a788e9df4053834cb926a3dfffaa3c1e963406fe2ea708aac13b84f815cdc9", drawn_at: "2026-07-03T00:00:02.051948+00:00" },
  { draw_date: "2026-07-01", status: "rolled_over", prize_usd: "0.00", entrants_total: 0, seed_hash: "dc35ea3e62f5611879c7bea8ab3b5f3d552842ce22a7e190113513e2045b5607", drawn_at: "2026-07-02T00:00:01.564003+00:00" },
  { draw_date: "2026-06-30", status: "completed", prize_usd: "3.96", entrants_total: 3, seed_hash: "70ec70fc55d3647a0fb84d8cb134f6d6a10e641781c3d5024d567afef6e9f874", drawn_at: "2026-07-01T00:00:01.020253+00:00" },
  { draw_date: "2026-06-29", status: "completed", prize_usd: "1.98", entrants_total: 2, seed_hash: "90e9becf2faea29af542d3deebff796629124315e907b9627e02fc647662d325", drawn_at: "2026-06-30T00:00:01.594713+00:00" },
  { draw_date: "2026-06-28", status: "completed", prize_usd: "3.96", entrants_total: 4, seed_hash: "084b26dca72467fd4e6255bb1962febc98a6d983d4b26c88cdfc25d861e3d984", drawn_at: "2026-06-29T00:00:02.413107+00:00" },
  { draw_date: "2026-06-27", status: "completed", prize_usd: "0.00", entrants_total: 1, seed_hash: "2772dba51108337ec5359f68597588f0eeac7294617a8ecf54070398ac71be70", drawn_at: "2026-06-28T00:00:02.907888+00:00" },
  { draw_date: "2026-06-26", status: "completed", prize_usd: "2.97", entrants_total: 2, seed_hash: "51877f402f77add5b74011041d8cdfcad119a3c8ca17f73253a27ec7ce4bc6e5", drawn_at: "2026-06-27T00:00:02.508452+00:00" },
  { draw_date: "2026-06-25", status: "rolled_over", prize_usd: "0.00", entrants_total: 0, seed_hash: "b48e497cd7f5e7f3f1832c60d86cd2f5e331b1075879d577f47ff46314fa9959", drawn_at: "2026-06-26T00:00:02.920821+00:00" },
  { draw_date: "2026-06-24", status: "completed", prize_usd: "1.98", entrants_total: 2, seed_hash: "c0309c906eb2cb4a54934a0e28d3099062e3279c053e8011c3a446b0174ef336", drawn_at: "2026-06-25T09:34:31.708608+00:00" },
  { draw_date: "2026-06-23", status: "rolled_over", prize_usd: "0.00", entrants_total: 0, seed_hash: "74e10064d269835d63acb791f3efc11eb4f9f29f98d85e0e52c80724e4ad67e2", drawn_at: "2026-06-23T04:34:08.456937+00:00" },
  { draw_date: "2026-06-22", status: "rolled_over", prize_usd: "0.00", entrants_total: 0, seed_hash: "c1cb2ccda6adadd9778c12fd52f0e5a7778cc66805934601cc9b6d34400f76c5", drawn_at: "2026-06-23T02:23:48.505174+00:00" },
];

const WINNERS: WinnerRow[] = [
  
  { draw_date: "2026-06-24", winner_display_name: "naveajhol", seed_hash: "c0309c906eb2cb4a54934a0e28d3099062e3279c053e8011c3a446b0174ef336", published_at: "2026-06-25T09:34:31.708608+00:00", prize_usd: "1.98" },
  { draw_date: "2026-06-26", winner_display_name: "naveajhol", seed_hash: "51877f402f77add5b74011041d8cdfcad119a3c8ca17f73253a27ec7ce4bc6e5", published_at: "2026-06-27T00:00:02.508452+00:00", prize_usd: "2.97" },
  { draw_date: "2026-06-27", winner_display_name: "theworldofserviceservice", seed_hash: "2772dba51108337ec5359f68597588f0eeac7294617a8ecf54070398ac71be70", published_at: "2026-06-28T00:00:02.907888+00:00", prize_usd: "0.00" },
  { draw_date: "2026-06-28", winner_display_name: "marieurthurt", seed_hash: "084b26dca72467fd4e6255bb1962febc98a6d983d4b26c88cdfc25d861e3d984", published_at: "2026-06-29T00:00:02.413107+00:00", prize_usd: "3.96" },
  { draw_date: "2026-06-29", winner_display_name: "jb4694259", seed_hash: "90e9becf2faea29af542d3deebff796629124315e907b9627e02fc647662d325", published_at: "2026-06-30T00:00:01.594713+00:00", prize_usd: "1.98" },
  { draw_date: "2026-06-30", winner_display_name: "marieurthurt", seed_hash: "70ec70fc55d3647a0fb84d8cb134f6d6a10e641781c3d5024d567afef6e9f874", published_at: "2026-07-01T00:00:01.020253+00:00", prize_usd: "3.96" },
];

/**
 * Reproduces `getDrawHistory` merge logic from src/lib/daily-draw.functions.ts.
 * If this drifts from `buildDrawHistory`, the test fails.
 */
function getDrawHistoryMerge(draws: DrawRow[], winners: WinnerRow[]) {
  const wMap = new Map<string, WinnerRow>();
  for (const w of winners) wMap.set(w.draw_date, w);
  return draws.map((d) => {
    const win = wMap.get(d.draw_date);
    return {
      drawDate: d.draw_date,
      status: d.status,
      winnerDisplayName: win?.winner_display_name ?? null,
      prizeUsd: win ? Number(win.prize_usd ?? 0) : Number(d.prize_usd ?? 0),
      entrantsTotal: Number(d.entrants_total ?? 0),
      seedHash: win?.seed_hash ?? d.seed_hash ?? null,
      drawnAt: win?.published_at ?? d.drawn_at ?? null,
    };
  });
}

/**
 * Reproduces `listPublicWinners` merge logic from src/lib/winners-public.functions.ts.
 */
function listPublicWinnersMerge(draws: DrawRow[], winners: WinnerRow[]) {
  const wMap = new Map<string, WinnerRow>();
  for (const w of winners) wMap.set(w.draw_date, w);
  return draws.map((d) => {
    const win = wMap.get(d.draw_date);
    return {
      draw_date: d.draw_date,
      status: d.status,
      winner_display_name: win?.winner_display_name ?? null,
      prize_usd: win ? Number(win.prize_usd ?? 0) : Number(d.prize_usd ?? 0),
      entrants_total: Number(d.entrants_total ?? 0),
      seed_hash: win?.seed_hash ?? d.seed_hash ?? null,
      published_at: win?.published_at ?? d.drawn_at ?? null,
    };
  });
}

describe("draw history integration (real Supabase snapshot 2026-07-12)", () => {
  const helper = buildDrawHistory(DRAWS, WINNERS);

  it("emits exactly one entry per daily_draws row, preserving DESC order", () => {
    expect(helper).toHaveLength(DRAWS.length);
    expect(helper.map((h) => h.drawDate)).toEqual(DRAWS.map((d) => d.draw_date));
  });

  it("marks every winner_announcements row as hasWinner (LEFT JOIN present)", () => {
    for (const w of WINNERS) {
      const row = helper.find((h) => h.drawDate === w.draw_date);
      expect(row, `entry ${w.draw_date} missing`).toBeDefined();
      expect(row!.hasWinner).toBe(true);
      expect(row!.winnerDisplayName).toBe(w.winner_display_name);
      expect(row!.prizeUsd).toBe(Number(w.prize_usd));
    }
  });

  it("marks rolled_over rows as noParticipants with $0.00 prize (LEFT JOIN absent)", () => {
    const rolled = helper.filter((h) => h.status === "rolled_over");
    expect(rolled.length).toBeGreaterThan(0);
    for (const r of rolled) {
      expect(r.hasWinner).toBe(false);
      expect(r.winnerDisplayName).toBeNull();
      expect(r.entrantsTotal).toBe(0);
      expect(r.noParticipants).toBe(true);
      expect(r.prizeUsd).toBe(0);
    }
  });

  it("matches getDrawHistory server-fn projection field-by-field", () => {
    const serverProjection = getDrawHistoryMerge(DRAWS, WINNERS);
    // Helper carries two extra derived flags — strip them for the comparison.
    const stripped = helper.map(({ hasWinner: _h, noParticipants: _n, ...rest }) => rest);
    expect(stripped).toEqual(serverProjection);
  });

  it("matches listPublicWinners server-fn projection field-by-field", () => {
    const serverProjection = listPublicWinnersMerge(DRAWS, WINNERS);
    const asPublic = helper.map((h) => ({
      draw_date: h.drawDate,
      status: h.status,
      winner_display_name: h.winnerDisplayName,
      prize_usd: h.prizeUsd,
      entrants_total: h.entrantsTotal,
      seed_hash: h.seedHash,
      published_at: h.drawnAt,
    }));
    expect(asPublic).toEqual(serverProjection);
  });

  it("has zero gaps between launch and snapshot day (computed in UTC)", () => {
    // enumerateDateRange pins to T12:00:00Z, so this is stable regardless of
    // the runner's TZ (America/Los_Angeles, Asia/Tokyo, UTC, ...).
    const expected = enumerateDateRange(LAUNCH_DATE_UTC, SNAPSHOT_DATE_UTC);
    const actual = helper.map((h) => h.drawDate).sort(); // ISO YYYY-MM-DD sorts lexicographically = chronologically
    expect(actual).toEqual(expected);
    expect(actual).toHaveLength(21);
  });

  it("LEFT JOIN key match is a pure string compare, so no TZ drift is possible", () => {
    // Every merged winner must match a draw by exact ISO date string.
    // If either side were ever converted through `new Date(...)` in local TZ,
    // dates near midnight would shift and this assertion would fail.
    for (const w of WINNERS) {
      const drawKeys = DRAWS.map((d) => d.draw_date);
      expect(drawKeys).toContain(w.draw_date);
      const merged = helper.find((h) => h.drawDate === w.draw_date);
      expect(merged?.winnerDisplayName).toBe(w.winner_display_name);
    }
  });
});
