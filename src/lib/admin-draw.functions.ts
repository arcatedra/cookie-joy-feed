import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
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
