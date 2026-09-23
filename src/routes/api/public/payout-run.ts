/**
 * Transferencias diarias a los negocios aliados.
 *
 * Recorre los pedidos ya cobrados y todavía no transferidos cuyo negocio
 * tiene su cuenta de cobro lista, y le manda la parte de sus productos.
 * La entrega (tramo + peso + propina) se queda en la plataforma.
 *
 * Protegido por cabecera `x-payout-secret`. Pensado para llamarse una vez
 * al día desde un programador externo o pg_cron.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import process from "node:process";

const MAX_ORDERS = 200;

function money(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

async function run(): Promise<Response> {
  const { paymentsEnvironmentForHost, stripePost } = await import("@/lib/stripe.server");
  const env = paymentsEnvironmentForHost(null);

  const db = createClient(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
    { auth: { persistSession: false } },
  );

  const { data: rows, error } = await db
    .from("store_orders")
    .select(
      "id, business_id, monto_capturado, costo_envio, cargo_peso, cargo_servicio, propina, credito_aplicado, capturado_en",
    )
    .is("transferido_en", null)
    .not("capturado_en", "is", null)
    .gt("monto_capturado", 0)
    .order("capturado_en", { ascending: true })
    .limit(MAX_ORDERS);
  if (error) return new Response(`db error: ${error.message}`, { status: 500 });

  const orders = rows ?? [];
  if (orders.length === 0) return Response.json({ ok: true, transferred: 0 });

  const businessIds = [...new Set(orders.map((o: any) => o.business_id))];
  const { data: bizRows } = await db
    .from("businesses")
    .select("id, stripe_account_id, stripe_payouts_enabled")
    .in("id", businessIds);
  const bizById = new Map((bizRows ?? []).map((b: any) => [b.id, b]));

  let transferred = 0;
  let skipped = 0;

  for (const o of orders as any[]) {
    const biz = bizById.get(o.business_id);
    if (!biz?.stripe_account_id || !biz.stripe_payouts_enabled) {
      skipped++;
      continue;
    }
    // Parte del negocio = lo cobrado menos todo lo que es de la plataforma
    // y del repartidor (envío por tramo, cargo por peso, servicio y propina).
    const platform =
      money(o.costo_envio) + money(o.cargo_peso) + money(o.cargo_servicio) + money(o.propina);
    const captured = money(o.monto_capturado);
    const storeUsd = Math.max(0, Math.min(captured, captured + money(o.credito_aplicado) - platform));
    const cents = Math.round(storeUsd * 100);
    if (cents <= 0) {
      await db
        .from("store_orders")
        .update({ monto_transferido_negocio: 0, transferido_en: new Date().toISOString() })
        .eq("id", o.id);
      continue;
    }

    try {
      const tr = await stripePost<any>(
        "/v1/transfers",
        {
          amount: cents,
          currency: "usd",
          destination: biz.stripe_account_id,
          metadata: { store_order_id: o.id, business_id: o.business_id },
        },
        env,
        { "Idempotency-Key": `store-payout-${o.id}-${cents}` },
      );
      await db
        .from("store_orders")
        .update({
          monto_transferido_negocio: cents / 100,
          transferido_en: new Date().toISOString(),
          transfer_id: tr?.id ?? null,
        })
        .eq("id", o.id);
      transferred++;
    } catch (e) {
      console.error("[payout-run] transferencia fallida", o.id, e);
      skipped++;
    }
  }

  return Response.json({ ok: true, transferred, skipped });
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
