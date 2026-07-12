import { describe, it, expect } from "vitest";
import { buildDrawHistory, enumerateDateRange, type DrawRow, type WinnerRow } from "./draw-history";

const LAUNCH = "2026-06-22";
const TODAY = "2026-07-12";

function makeDraw(overrides: Partial<DrawRow> & { draw_date: string }): DrawRow {
  return {
    status: "rolled_over",
    prize_usd: 0,
    entrants_total: 0,
    seed_hash: null,
    drawn_at: null,
    ...overrides,
  };
}

describe("buildDrawHistory", () => {
  it("returns one entry per daily_draws row, in the same order", () => {
    const draws: DrawRow[] = [
      makeDraw({ draw_date: "2026-07-12" }),
      makeDraw({ draw_date: "2026-07-11" }),
      makeDraw({ draw_date: "2026-07-10" }),
    ];
    const result = buildDrawHistory(draws, []);
    expect(result.map((r) => r.drawDate)).toEqual(["2026-07-12", "2026-07-11", "2026-07-10"]);
  });

  it("marks days with 0 participants as noParticipants with $0.00 prize", () => {
    const draws: DrawRow[] = [
      makeDraw({ draw_date: "2026-07-12", status: "rolled_over", entrants_total: 0, prize_usd: 0 }),
    ];
    const [row] = buildDrawHistory(draws, []);
    expect(row.noParticipants).toBe(true);
    expect(row.entrantsTotal).toBe(0);
    expect(row.prizeUsd).toBe(0);
    expect(row.hasWinner).toBe(false);
    expect(row.winnerDisplayName).toBeNull();
  });

  it("marks completed draws with a winner as hasWinner and pulls prize from the announcement", () => {
    const draws: DrawRow[] = [
      makeDraw({ draw_date: "2026-06-30", status: "completed", entrants_total: 3, prize_usd: "3.96" }),
    ];
    const winners: WinnerRow[] = [
      {
        draw_date: "2026-06-30",
        winner_display_name: "Ana P.",
        seed_hash: "abc123",
        published_at: "2026-07-01T00:00:00Z",
        prize_usd: "3.96",
      },
    ];
    const [row] = buildDrawHistory(draws, winners);
    expect(row.hasWinner).toBe(true);
    expect(row.winnerDisplayName).toBe("Ana P.");
    expect(row.prizeUsd).toBe(3.96);
    expect(row.seedHash).toBe("abc123");
    expect(row.noParticipants).toBe(false);
  });

  it("shows rolled-over days with entrants as no-winner but keeps entrant count", () => {
    const draws: DrawRow[] = [
      makeDraw({ draw_date: "2026-06-27", status: "rolled_over", entrants_total: 1, prize_usd: 0 }),
    ];
    const [row] = buildDrawHistory(draws, []);
    expect(row.hasWinner).toBe(false);
    expect(row.noParticipants).toBe(false);
    expect(row.entrantsTotal).toBe(1);
    expect(row.prizeUsd).toBe(0);
  });

  it("does not mark a day as hasWinner when status is not completed, even if a winner row exists", () => {
    const draws: DrawRow[] = [
      makeDraw({ draw_date: "2026-07-05", status: "drawing", entrants_total: 2 }),
    ];
    const winners: WinnerRow[] = [
      { draw_date: "2026-07-05", winner_display_name: "X", seed_hash: null, published_at: "", prize_usd: 0 },
    ];
    const [row] = buildDrawHistory(draws, winners);
    expect(row.hasWinner).toBe(false);
  });

  it("covers every date between launch and today with no gaps", () => {
    const range = enumerateDateRange(LAUNCH, TODAY);
    const draws: DrawRow[] = range.map((d) => makeDraw({ draw_date: d }));
    const result = buildDrawHistory(draws, []);
    expect(result).toHaveLength(range.length);
    expect(result.map((r) => r.drawDate).sort()).toEqual([...range].sort());
    for (const row of result) {
      expect(row.entrantsTotal).toBe(0);
      expect(row.prizeUsd).toBe(0);
      expect(row.noParticipants).toBe(true);
      expect(row.hasWinner).toBe(false);
    }
  });
});

describe("enumerateDateRange", () => {
  it("is inclusive on both ends", () => {
    expect(enumerateDateRange("2026-07-10", "2026-07-12")).toEqual([
      "2026-07-10",
      "2026-07-11",
      "2026-07-12",
    ]);
  });

  it("returns a single day when start === end", () => {
    expect(enumerateDateRange("2026-07-12", "2026-07-12")).toEqual(["2026-07-12"]);
  });

  it("returns 21 days for the launch → 2026-07-12 window", () => {
    expect(enumerateDateRange(LAUNCH, TODAY)).toHaveLength(21);
  });
});
