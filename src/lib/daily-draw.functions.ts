import { createServerFn } from "@tanstack/react-start";
import { getRequest, getCookie } from "@tanstack/react-start/server";
import { z } from "zod";

async function resolveSubject(): Promise<
  | { kind: "user"; userId: string; email: string | null }
  | { kind: "guest"; email: string }
  | null
> {
  try {
    const req = getRequest();
    const auth = req?.headers.get("authorization");
    if (auth?.startsWith("Bearer ")) {
      const token = auth.slice(7);
      if (token) {
        const { createClient } = await import("@supabase/supabase-js");
        const sb = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );
        const { data } = await sb.auth.getClaims(token);
        if (data?.claims?.sub) {
          return {
            kind: "user",
            userId: data.claims.sub as string,
            email: (data.claims.email as string | undefined) ?? null,
          };
        }
      }
    }
  } catch {/* ignore */}
  const raw = getCookie("origen_guest");
  if (raw) {
    const email = raw.split("|")[0];
    if (email) return { kind: "guest", email };
  }
  return null;
}

export const getTodayDraw = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const [drawRes, cfgRes] = await Promise.all([
    sb.rpc("get_today_draw"),
    sb.rpc("get_sweepstakes_public_config"),
  ]);
  if (drawRes.error) {
    console.error("[daily-draw] get_today_draw error", drawRes.error);
    return null;
  }
  const row = Array.isArray(drawRes.data) ? drawRes.data[0] : drawRes.data;
  if (!row) return null;
  const cfgRow = Array.isArray(cfgRes.data) ? cfgRes.data[0] : cfgRes.data;
  const addressValid = Boolean(cfgRow?.address_valid ?? false);
  return {
    drawDate: row.draw_date as string,
    status: row.status as "open" | "drawing" | "completed" | "rolled_over",
    scheduledAt: row.scheduled_at as string,
    prizeUsd: Number(row.prize_usd_live ?? 0),
    ticketsTotal: Number(row.tickets_total ?? 0),
    entrantsTotal: Number(row.entrants_total ?? 0),
    winnerDisplayName: (row.winner_display_name as string | null) ?? null,
    seedHash: (row.seed_hash as string | null) ?? null,
    rolledOverFrom: (row.rolled_over_from as string | null) ?? null,
    addressValid,
    maxDailyPrizeUsd: Number(cfgRow?.max_daily_prize_usd ?? 4999),
  };
});

export const getRecentWinners = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.rpc("get_recent_winners", { p_limit: 14 });
  if (error) {
    console.error("[daily-draw] get_recent_winners error", error);
    return [];
  }
  return (data ?? []).map((w: { draw_date: string; winner_display_name: string | null; prize_usd: number | string; seed_hash: string | null; drawn_at: string }) => ({
    drawDate: w.draw_date,
    winnerDisplayName: w.winner_display_name,
    prizeUsd: Number(w.prize_usd),
    seedHash: w.seed_hash,
    drawnAt: w.drawn_at,
  }));
});

export const getDrawHistory = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ limit: z.number().int().min(1).max(100).default(50) }).parse(data ?? {}))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data: rows, error } = await sb.rpc("get_recent_winners", { p_limit: data.limit });
    if (error) {
      console.error("[daily-draw] getDrawHistory error", error);
      return [];
    }
    return (rows ?? []).map((w: { draw_date: string; winner_display_name: string | null; prize_usd: number | string; seed_hash: string | null; drawn_at: string }) => ({
      drawDate: w.draw_date,
      winnerDisplayName: w.winner_display_name,
      prizeUsd: Number(w.prize_usd),
      seedHash: w.seed_hash,
      drawnAt: w.drawn_at,
    }));
  });


export const getWinnerAnnouncements = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.rpc("get_winner_announcements", { p_limit: 10 });
  if (error) {
    console.error("[daily-draw] get_winner_announcements error", error);
    return [];
  }
  return (data ?? []).map((w: { draw_date: string; winner_display_name: string; prize_usd: number | string; seed_hash: string | null; published_at: string }) => ({
    drawDate: w.draw_date,
    winnerDisplayName: w.winner_display_name,
    prizeUsd: Number(w.prize_usd),
    seedHash: w.seed_hash,
    publishedAt: w.published_at,
  }));
});

const enterSchema = z.object({
  tickets: z.number().int().min(1).max(50),
  displayName: z.string().trim().min(1).max(60),
});

export const enterDailyDraw = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => enterSchema.parse(d))
  .handler(async ({ data }) => {
    const subject = await resolveSubject();
    if (!subject) {
      return { ok: false as const, error: "Inicia sesión o regístrate por participación gratuita primero." };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("enter_daily_draw", {
      p_user_id: (subject.kind === "user" ? subject.userId : null) as unknown as string,
      p_email: (subject.kind === "guest"
        ? subject.email
        : (subject.email ?? "")) as string,
      p_display_name: data.displayName,
      p_tickets: data.tickets,
      p_cost_per_ticket: 10,
    });
    if (error) {
      const msg = error.message || "";
      if (msg.includes("SPONSOR_ADDRESS_NOT_CONFIGURED"))
        return { ok: false as const, error: "El sorteo diario en USD aún no está activo. Pronto se anunciará la fecha de lanzamiento." };
      if (msg.includes("INSUFFICIENT_STARS"))
        return { ok: false as const, error: "No tienes suficientes estrellas (10⭐ por boleto)." };
      if (msg.includes("DRAW_CLOSED"))
        return { ok: false as const, error: "El sorteo de hoy ya está cerrado." };
      if (msg.includes("INVALID_TICKETS"))
        return { ok: false as const, error: "Cantidad de boletos inválida." };
      console.error("[daily-draw] enter error", error);
      return { ok: false as const, error: "No se pudo registrar tu boleto." };
    }
    const row = Array.isArray(result) ? result[0] : result;
    return {
      ok: true as const,
      newBalance: Number(row?.new_balance ?? 0),
      ticketsAdded: Number(row?.tickets_added ?? 0),
    };
  });
