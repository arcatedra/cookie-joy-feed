/**
 * Transferencias automáticas de Stripe Connect (una vez al día).
 *
 *  - A los negocios: la parte de sus productos de cada pedido ya cobrado.
 *  - A los repartidores: reintenta pagos pendientes o fallidos.
 *
 * Protegido por la cabecera `x-payout-secret`. Cada ejecución queda
 * registrada en `payout_runs`.
 */
import { createFileRoute } from "@tanstack/react-router";
import process from "node:process";

export const Route = createFileRoute("/api/public/payout-run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PAYOUT_RUN_SECRET"];
        if (!secret || request.headers.get("x-payout-secret") !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { runPayouts } = await import("@/lib/payout-run.server");
        const res = await runPayouts("cron");
        return Response.json(res, { status: res.ok ? 200 : 500 });
      },
    },
  },
});
