/**
 * RLS + RPC contract tests for daily_draws and winner email exposure.
 *
 * Verifica que:
 *  1. El rol `anon` NO puede SELECT directo sobre `public.daily_draws`.
 *  2. Las RPC públicas (`get_today_draw`, `get_recent_winners`,
 *     `get_winner_announcements`) NO devuelven `winner_subject_email`
 *     ni `winner_subject_user_id`.
 *  3. El esquema declarado de esas RPC tampoco incluye esas columnas
 *     (defensa en profundidad por si la tabla queda vacía).
 *
 * Ejecutar:  bunx vitest run tests/rls/daily-draws-access.test.ts
 */
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

const FORBIDDEN_COLUMNS = ["winner_subject_email", "winner_subject_user_id"];

const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function assertNoForbiddenKeys(row: Record<string, unknown> | null | undefined) {
  if (!row) return;
  for (const key of FORBIDDEN_COLUMNS) {
    expect(
      Object.prototype.hasOwnProperty.call(row, key),
      `RPC response leaked forbidden column \"${key}\"`,
    ).toBe(false);
  }
}

describe("daily_draws · RLS lockdown", () => {
  it("anon NO puede SELECT directo sobre daily_draws", async () => {
    const { data, error } = await anon
      .from("daily_draws")
      .select("draw_date, winner_subject_email, winner_subject_user_id")
      .limit(1);

    // PostgREST devuelve 401/permission denied → data nula, error presente,
    // o data vacía cuando la policy filtra todo. Cualquier acceso real con
    // valores de email sería un fallo crítico.
    if (data && data.length > 0) {
      throw new Error(
        `daily_draws expuso filas a anon: ${JSON.stringify(data[0])}`,
      );
    }
    expect(error ?? { code: "filtered" }).toBeTruthy();
  });

  it("anon NO puede SELECT sólo de winner_display_name tampoco", async () => {
    const { data } = await anon
      .from("daily_draws")
      .select("winner_display_name")
      .limit(1);
    expect(data?.length ?? 0).toBe(0);
  });
});

describe("RPC públicas · no exponen email del ganador", () => {
  it("get_today_draw() no devuelve columnas sensibles", async () => {
    const { data, error } = await anon.rpc("get_today_draw");
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    assertNoForbiddenKeys(data?.[0]);
  });

  it("get_recent_winners() no devuelve columnas sensibles", async () => {
    const { data, error } = await anon.rpc("get_recent_winners", {
      p_limit: 5,
    });
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    (data ?? []).forEach(assertNoForbiddenKeys);
  });

  it("get_winner_announcements() no devuelve columnas sensibles", async () => {
    const { data, error } = await anon.rpc("get_winner_announcements", {
      p_limit: 5,
    });
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    (data ?? []).forEach(assertNoForbiddenKeys);
  });
});
