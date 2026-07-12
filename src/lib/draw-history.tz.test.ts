import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { buildDrawHistory, enumerateDateRange, type DrawRow, type WinnerRow } from "./draw-history";

/**
 * TZ-robustness test.
 *
 * Goal: prove that the LEFT JOIN key (draw_date) and the helper output never
 * shift when the runner's local time zone changes, especially for rows whose
 * `drawn_at` / `published_at` timestamps land right around midnight UTC where
 * a naive `new Date(...).toISOString().slice(0,10)` conversion in local TZ
 * would flip the calendar day.
 *
 * We simulate several TZs by monkey-patching `Intl.DateTimeFormat.prototype
 * .resolvedOptions` and `Date.prototype.getTimezoneOffset`. The helper is pure
 * and works on ISO date strings only, so its output must be byte-identical
 * across every TZ. If a regression ever introduces a `new Date(draw_date)` or
 * `toLocaleDateString()` in the merge, this test catches it.
 */

const TZS: Array<{ name: string; offsetMin: number }> = [
  { name: "UTC", offsetMin: 0 },
  { name: "America/Los_Angeles", offsetMin: 7 * 60 }, // getTimezoneOffset is positive for west-of-UTC
  { name: "America/New_York", offsetMin: 4 * 60 },
  { name: "Asia/Tokyo", offsetMin: -9 * 60 },
  { name: "Pacific/Kiritimati", offsetMin: -14 * 60 }, // UTC+14, extreme east
  { name: "Pacific/Pago_Pago", offsetMin: 11 * 60 }, // UTC-11, extreme west
];

// Draws include multiple dates whose drawn_at is within a few minutes of UTC
// midnight (both sides). If any code path built a Date from these timestamps
// and read the local day, results would diverge per TZ.
const DRAWS: DrawRow[] = [
  { draw_date: "2026-07-12", status: "completed", prize_usd: "5.00", entrants_total: 3, seed_hash: "h12", drawn_at: "2026-07-13T00:00:01.000Z" },
  { draw_date: "2026-07-11", status: "completed", prize_usd: "2.50", entrants_total: 2, seed_hash: "h11", drawn_at: "2026-07-11T23:59:58.000Z" },
  { draw_date: "2026-07-10", status: "rolled_over", prize_usd: "0", entrants_total: 0, seed_hash: null, drawn_at: "2026-07-11T00:00:00.500Z" },
  { draw_date: "2026-07-09", status: "completed", prize_usd: "1.00", entrants_total: 1, seed_hash: "h09", drawn_at: "2026-07-10T00:00:02.000Z" },
  { draw_date: "2026-07-08", status: "rolled_over", prize_usd: "0", entrants_total: 0, seed_hash: null, drawn_at: null },
];

const WINNERS: WinnerRow[] = [
  { draw_date: "2026-07-12", winner_display_name: "alice", seed_hash: "h12", published_at: "2026-07-13T00:00:01.000Z", prize_usd: "5.00" },
  { draw_date: "2026-07-11", winner_display_name: "bob", seed_hash: "h11", published_at: "2026-07-11T23:59:58.000Z", prize_usd: "2.50" },
  { draw_date: "2026-07-09", winner_display_name: "carol", seed_hash: "h09", published_at: "2026-07-10T00:00:02.000Z", prize_usd: "1.00" },
];

const originalOffset = Date.prototype.getTimezoneOffset;

function simulateTZ(offsetMin: number) {
  // eslint-disable-next-line no-extend-native
  Date.prototype.getTimezoneOffset = function () {
    return offsetMin;
  };
}

function restoreTZ() {
  // eslint-disable-next-line no-extend-native
  Date.prototype.getTimezoneOffset = originalOffset;
}

// Baseline computed in "real" UTC once — every TZ must reproduce this exactly.
const BASELINE = buildDrawHistory(DRAWS, WINNERS);
const BASELINE_RANGE = enumerateDateRange("2026-07-08", "2026-07-12");

describe("draw history is TZ-invariant across simulated time zones", () => {
  afterEach(() => restoreTZ());

  for (const tz of TZS) {
    describe(`TZ=${tz.name} (offset ${tz.offsetMin}m)`, () => {
      beforeEach(() => simulateTZ(tz.offsetMin));

      it("buildDrawHistory output is byte-identical to the UTC baseline", () => {
        const out = buildDrawHistory(DRAWS, WINNERS);
        expect(out).toEqual(BASELINE);
      });

      it("every winner still LEFT-JOINs to the correct draw_date (no midnight drift)", () => {
        const out = buildDrawHistory(DRAWS, WINNERS);
        for (const w of WINNERS) {
          const row = out.find((r) => r.drawDate === w.draw_date);
          expect(row, `winner ${w.draw_date} lost its join in TZ ${tz.name}`).toBeDefined();
          expect(row!.hasWinner).toBe(true);
          expect(row!.winnerDisplayName).toBe(w.winner_display_name);
          expect(row!.prizeUsd).toBe(Number(w.prize_usd));
        }
      });

      it("rows with drawn_at seconds away from UTC midnight keep their calendar day", () => {
        const out = buildDrawHistory(DRAWS, WINNERS);
        // 2026-07-11 is a full second before UTC midnight; in west-of-UTC zones a
        // naive local-time conversion would flip it to 2026-07-12.
        // 2026-07-10's drawn_at is just after midnight UTC; in east-of-UTC zones a
        // naive local-time conversion would flip it back to 2026-07-11.
        expect(out.map((r) => r.drawDate)).toEqual(DRAWS.map((d) => d.draw_date));
      });

      it("enumerateDateRange returns identical days regardless of TZ", () => {
        expect(enumerateDateRange("2026-07-08", "2026-07-12")).toEqual(BASELINE_RANGE);
      });

      it("enumerateDateRange handles a range that crosses a month boundary without drift", () => {
        // June 30 → July 2 must always be exactly 3 days, in order, in every TZ.
        expect(enumerateDateRange("2026-06-30", "2026-07-02")).toEqual([
          "2026-06-30",
          "2026-07-01",
          "2026-07-02",
        ]);
      });
    });
  }
});

describe("cross-TZ determinism", () => {
  afterEach(() => restoreTZ());

  it("produces the exact same helper output in every simulated TZ", () => {
    const results = TZS.map((tz) => {
      simulateTZ(tz.offsetMin);
      const out = buildDrawHistory(DRAWS, WINNERS);
      restoreTZ();
      return { tz: tz.name, out };
    });

    const first = JSON.stringify(results[0].out);
    for (const r of results) {
      expect(JSON.stringify(r.out), `TZ ${r.tz} diverged from ${results[0].tz}`).toBe(first);
    }
  });

  it("produces the exact same enumerateDateRange in every simulated TZ", () => {
    const range = enumerateDateRange("2026-06-22", "2026-07-12");
    expect(range).toHaveLength(21);
    for (const tz of TZS) {
      simulateTZ(tz.offsetMin);
      expect(enumerateDateRange("2026-06-22", "2026-07-12")).toEqual(range);
      restoreTZ();
    }
  });
});
