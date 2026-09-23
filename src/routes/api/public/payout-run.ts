/**
 * Transferencias automáticas de Stripe Connect.
 *
 *  - A los negocios: la parte de sus productos de cada pedido ya cobrado.
 *  - A los repartidores: su parte del tramo + peso + propina de los pedidos
 *    entregados. Si aún no conectaron su cuenta, quedan pendientes.
 *
 * Protegido por la cabecera `x-payout-secret`. Pensado para llamarse una vez
 * al día desde un programador externo o pg_cron.
 */
import { createFileRoute } from "@tanstack/react-router";
import process from "node:process";

const MAX_ROWS = 200;

async function run(): Promise<Response> {
  const { adminDb, transferDriverPayout, transferStoreOrder } = await import("@/lib/payouts.server");
  const db = adminDb();

  // ---- Negocios ---------------------------------------------------------
  const { data: orders, error } = await db
    .from("store_orders")
    .select("id")
    .is("transferido_en", null)
    .not("capturado_en", "is", null)
    .gt("monto_capturado", 0)
    .order("capturado_en", { ascending: true })
    .limit(MAX_ROWS);
  if (error) return new Response(`db error: ${error.message}`, { status: 500 });

  let transferred = 0;
  let skipped = 0;
  for (const o of orders ?? []) {
    const res = await transferStoreOrder(o.id, db);
    if (res.ok && !res.skipped) transferred++;
    else skipped++;
  }

  // ---- Repartidores ------------------------------------------------------
  const { data: payouts } = await db
    .from("driver_payouts")
    .select("id")
    .neq("status", "pagado")
    .order("created_at", { ascending: true })
    .limit(MAX_ROWS);

  let driversPaid = 0;
  let driversSkipped = 0;
  for (const p of payouts ?? []) {
    const res = await transferDriverPayout(p.id, db);
    if (res.ok && !res.skipped) driversPaid++;
    else driversSkipped++;
  }

  return Response.json({ ok: true, transferred, skipped, driversPaid, driversSkipped });
}

export const Route = createFileRoute("/api/public/payout-run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PAYOUT_RUN_SECRET"];
        if (!secret || request.headers.get("x-payout-secret") !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }
        return run();
      },
    },
  },
});
