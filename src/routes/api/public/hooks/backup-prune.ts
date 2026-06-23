import { createFileRoute } from "@tanstack/react-router";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const RETENTION_DAYS = 30;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const Route = createFileRoute("/api/public/hooks/backup-prune")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.BACKUP_HOOK_SECRET;
        if (!expected) {
          console.error("backup-prune: BACKUP_HOOK_SECRET missing");
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

        const now = new Date();
        const todayStamp = now.toISOString().slice(0, 10);
        const cutoff = new Date(now.getTime() - RETENTION_DAYS * 86400_000);

        // 1) List top-level "folders" (dated day prefixes) in the backups bucket
        const { data: rootEntries, error: listErr } = await supabaseAdmin.storage
          .from("backups")
          .list("", { limit: 1000 });
        if (listErr) {
          return Response.json({ ok: false, error: listErr.message }, { status: 500 });
        }

        const deleted: string[] = [];
        const archived: string[] = [];
        const errors: Array<{ path: string; error: string }> = [];

        // 2) Weekly archive: every Sunday (UTC), copy today's CSVs into weekly/<date>/
        if (now.getUTCDay() === 0) {
          const { data: dayFiles } = await supabaseAdmin.storage
            .from("backups")
            .list(todayStamp, { limit: 100 });
          for (const f of dayFiles ?? []) {
            const src = `${todayStamp}/${f.name}`;
            const dst = `weekly/${todayStamp}/${f.name}`;
            const { error: cpErr } = await supabaseAdmin.storage
              .from("backups")
              .copy(src, dst);
            if (cpErr && !/exists/i.test(cpErr.message)) {
              errors.push({ path: dst, error: cpErr.message });
            } else {
              archived.push(dst);
            }
          }
        }

        // 3) Retention: delete dated folders older than RETENTION_DAYS
        //    (never touch the "weekly/" prefix)
        for (const entry of rootEntries ?? []) {
          const name = entry.name;
          if (!DATE_RE.test(name)) continue; // skip "weekly" and anything non-dated
          const dt = new Date(`${name}T00:00:00Z`);
          if (isNaN(dt.getTime()) || dt >= cutoff) continue;

          const { data: dayFiles } = await supabaseAdmin.storage
            .from("backups")
            .list(name, { limit: 1000 });
          const paths = (dayFiles ?? []).map((f) => `${name}/${f.name}`);
          if (paths.length === 0) continue;
          const { error: rmErr } = await supabaseAdmin.storage
            .from("backups")
            .remove(paths);
          if (rmErr) {
            errors.push({ path: name, error: rmErr.message });
          } else {
            deleted.push(...paths);
          }
        }

        return Response.json({
          ok: true,
          retention_days: RETENTION_DAYS,
          deleted_count: deleted.length,
          archived_count: archived.length,
          errors,
        });
      },
      GET: async () => new Response("Method Not Allowed", { status: 405 }),
    },
  },
});
