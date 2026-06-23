import { createFileRoute } from "@tanstack/react-router";

const TABLES = [
  "winner_claims",
  "daily_draws",
  "daily_draw_entries",
  "winner_announcements",
  "amoe_entries",
  "profiles",
  "donations",
  "subscriptions",
  "user_tokens",
  "prize_pool_ledger",
  "sweepstakes_config",
] as const;

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const cols = Array.from(
    rows.reduce<Set<string>>((acc, r) => {
      Object.keys(r).forEach((k) => acc.add(k));
      return acc;
    }, new Set()),
  );
  const esc = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = cols.join(",");
  const body = rows.map((r) => cols.map((c) => esc(r[c])).join(",")).join("\n");
  return `${header}\n${body}\n`;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const Route = createFileRoute("/api/public/hooks/backup-csv")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.BACKUP_HOOK_SECRET;
        if (!expected) {
          console.error("backup-csv: BACKUP_HOOK_SECRET missing");
          return new Response("Server misconfigured", { status: 500 });
        }

        const auth = request.headers.get("authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        if (!token || !timingSafeEqual(token, expected)) {
          return new Response(null, { status: 401 });
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        const stamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
        const results: Array<{
          table: string;
          rows: number;
          path?: string;
          error?: string;
        }> = [];

        for (const table of TABLES) {
          try {
            const { data, error } = await supabaseAdmin
              .from(table)
              .select("*")
              .limit(100000);
            if (error) {
              results.push({ table, rows: 0, error: error.message });
              continue;
            }
            const rows = (data ?? []) as Record<string, unknown>[];
            const csv = toCsv(rows);
            const path = `${stamp}/${table}.csv`;
            const { error: upErr } = await supabaseAdmin.storage
              .from("backups")
              .upload(path, new Blob([csv], { type: "text/csv" }), {
                contentType: "text/csv",
                upsert: true,
              });
            if (upErr) {
              results.push({ table, rows: rows.length, error: upErr.message });
              continue;
            }
            results.push({ table, rows: rows.length, path });
          } catch (e) {
            results.push({
              table,
              rows: 0,
              error: e instanceof Error ? e.message : String(e),
            });
          }
        }

        return Response.json({ ok: true, stamp, results });
      },
      GET: async () => new Response("Method Not Allowed", { status: 405 }),
    },
  },
});
