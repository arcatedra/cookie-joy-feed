import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
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
