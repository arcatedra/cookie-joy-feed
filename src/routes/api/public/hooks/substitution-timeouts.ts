import { createFileRoute } from "@tanstack/react-router";

/**
 * Reloj de 10 minutos: aplica la regla por defecto a los artículos agotados
 * que el cliente no respondió. Se llama con una clave secreta (pg_cron o un
 * programador externo) para que el pedido nunca espere a nadie.
 */
export const Route = createFileRoute("/api/public/hooks/substitution-timeouts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["SUBS_TIMEOUT_SECRET"];
        const auth = request.headers.get("authorization") ?? "";
        if (!secret || auth !== `Bearer ${secret}`) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("apply_substitution_timeouts");
        if (error) {
          console.error("[substitution-timeouts]", error);
          return new Response(JSON.stringify({ ok: false }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ ok: true, applied: data ?? 0 }), {
          headers: { "content-type": "application/json", "cache-control": "no-store" },
        });
      },
    },
  },
});
