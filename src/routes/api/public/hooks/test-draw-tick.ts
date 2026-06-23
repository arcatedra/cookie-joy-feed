import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/test-draw-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") ?? request.headers.get("x-api-key");
        if (!apikey || apikey !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("run_test_draw_tick");
        if (error) {
          console.error("[test-draw-tick] rpc error", error);
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
        return Response.json({ ok: true, winner: Array.isArray(data) ? data[0] : data });
      },
      GET: async () => new Response("Method Not Allowed", { status: 405 }),
    },
  },
});
