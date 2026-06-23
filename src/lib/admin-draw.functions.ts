import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

// No middleware: guests get { isAdmin: false } instead of a 401.
export const checkIsAdmin = createServerFn({ method: "GET" }).handler(async () => {
  const authHeader = getRequestHeader("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token) return { isAdmin: false };

  const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    },
  );
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes.user) return { isAdmin: false };
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userRes.user.id,
    _role: "admin",
  });
  if (error) return { isAdmin: false };
  return { isAdmin: !!data };
});

export const triggerTestDraw = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Verify admin
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      return { ok: false as const, error: "Solo administradores pueden ejecutar el sorteo de prueba." };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("run_daily_draw");
    if (error) {
      console.error("[triggerTestDraw] rpc error", error);
      return { ok: false as const, error: error.message };
    }
    const row = Array.isArray(data) ? data[0] : data;
    return {
      ok: true as const,
      drawDate: row?.draw_date as string,
      status: row?.status as string,
      winnerDisplayName: (row?.winner_display_name as string | null) ?? null,
      prizeUsd: Number(row?.prize_usd ?? 0),
      seedHash: (row?.seed_hash as string | null) ?? null,
    };
  });

/**
 * Smoke test for the winner notification email.
 *
 * Inserts a synthetic `winner_claims` row using a unique past sentinel
 * draw_date in the 1970-01-01..1999-12-31 range (so it never collides
 * with real draws). The `trg_notify_winner` trigger fires `net.http_post`
 * to /api/public/hooks/notify-winner which enqueues a real email.
 *
 * Admin-only. Returns the synthetic draw_date + claim id so the caller
 * can inspect email_send_log afterwards.
 */
export const sendSmokeTestWinnerEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        email: z.string().email(),
        displayName: z.string().min(1).max(120).optional(),
        prizeUsd: z.number().positive().max(4999).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      return { ok: false as const, error: "Solo administradores." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Pick next free synthetic past date so we don't collide with real draws.
    const { data: maxRow } = await supabaseAdmin
      .from("winner_claims")
      .select("draw_date")
      .lt("draw_date", "2000-01-01")
      .order("draw_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    const base = maxRow?.draw_date ? new Date(maxRow.draw_date) : new Date("1970-01-01");
    base.setUTCDate(base.getUTCDate() + 1);
    const drawDate = base.toISOString().slice(0, 10);

    const deadline = new Date();
    deadline.setUTCDate(deadline.getUTCDate() + 14);

    const { data: claim, error: insErr } = await supabaseAdmin
      .from("winner_claims")
      .insert({
        draw_date: drawDate,
        user_id: context.userId,
        email: data.email.toLowerCase(),
        display_name: data.displayName ?? "Smoke Test",
        prize_usd: data.prizeUsd ?? 123.45,
        claim_deadline: deadline.toISOString(),
        status: "pending_verification",
      })
      .select("id, draw_date, email")
      .single();

    if (insErr || !claim) {
      console.error("[sendSmokeTestWinnerEmail] insert failed", insErr);
      return { ok: false as const, error: insErr?.message ?? "insert failed" };
    }

    return {
      ok: true as const,
      claimId: claim.id as string,
      drawDate: claim.draw_date as string,
      recipient: claim.email as string,
    };
  });
