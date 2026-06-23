import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

function checkBearer(request: Request): boolean {
  const secret = process.env.TEST_DRAW_TICK_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return false;
  const provided = auth.slice("Bearer ".length).trim();
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/hooks/test-draw-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!checkBearer(request)) {
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
