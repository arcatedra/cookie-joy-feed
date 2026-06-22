import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/run-daily-draw")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Light auth: require apikey header matches publishable key (cron uses it)
        const apikey = request.headers.get("apikey") ?? request.headers.get("x-api-key");
        if (!apikey || apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        // Gate: only execute if local time in America/New_York is >= 20:00
        const nowET = new Date(
          new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
        );
        if (nowET.getHours() < 20) {
          return Response.json({ skipped: true, reason: "before-8pm-et", hourET: nowET.getHours() });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("run_daily_draw");
        if (error) {
          console.error("[run-daily-draw] rpc error", error);
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
        return Response.json({ ok: true, result: data });
      },
      GET: async () => new Response("Method Not Allowed", { status: 405 }),
    },
  },
});
