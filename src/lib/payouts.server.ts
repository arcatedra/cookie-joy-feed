/**
 * Transferencias de Stripe Connect: a los negocios (valor de sus productos)
 * y a los repartidores (tramo + peso + propina).
 *
 * Solo para uso en servidor.
 */
import { createClient } from "@supabase/supabase-js";
import process from "node:process";

export function adminDb() {
  return createClient(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
    { auth: { persistSession: false } },
  ) as any;
}

export function money(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export interface TransferResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

/** Parte del negocio de un pedido ya cobrado. */
export function storeShareCents(o: any): number {
  const platform =
    money(o.costo_envio) + money(o.cargo_peso) + money(o.cargo_servicio) + money(o.propina);
  const captured = money(o.monto_capturado);
  const usd = Math.max(0, Math.min(captured, captured + money(o.credito_aplicado) - platform));
  return Math.round(usd * 100);
}

/** Transfiere a un negocio la parte de sus productos de un pedido. */
export async function transferStoreOrder(orderId: string, db = adminDb()): Promise<TransferResult> {
  const { paymentsEnvironmentForHost, stripePost } = await import("./stripe.server");
  const env = paymentsEnvironmentForHost(null);

  const { data: o } = await db
    .from("store_orders")
    .select(
      "id, business_id, monto_capturado, costo_envio, cargo_peso, cargo_servicio, propina, credito_aplicado, transferido_en",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (!o) return { ok: false, error: "Pedido no encontrado" };
  if (o.transferido_en) return { ok: true, skipped: true };

  const { data: biz } = await db
    .from("businesses")
    .select("stripe_account_id, stripe_payouts_enabled")
    .eq("id", o.business_id)
    .maybeSingle();
  if (!biz?.stripe_account_id || !biz.stripe_payouts_enabled) {
    return { ok: false, skipped: true, error: "El negocio aún no conectó su cuenta" };
  }

  const cents = storeShareCents(o);
  if (cents <= 0) {
    await db
      .from("store_orders")
      .update({ monto_transferido_negocio: 0, transferido_en: new Date().toISOString() })
      .eq("id", o.id);
    return { ok: true, skipped: true };
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
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error de transferencia";
    console.error("[payouts] transferencia a negocio fallida", o.id, msg);
    return { ok: false, error: msg };
  }
}

/** Transfiere al repartidor su pago de un pedido entregado. */
export async function transferDriverPayout(
  payoutId: string,
  db = adminDb(),
): Promise<TransferResult> {
  const { paymentsEnvironmentForHost, stripePost } = await import("./stripe.server");
  const env = paymentsEnvironmentForHost(null);

  const { data: p } = await db
    .from("driver_payouts")
    .select("id, driver_id, order_id, amount_usd, status")
    .eq("id", payoutId)
    .maybeSingle();
  if (!p) return { ok: false, error: "Pago no encontrado" };
  if (p.status === "pagado") return { ok: true, skipped: true };

  const { data: drv } = await db
    .from("drivers")
    .select("stripe_account_id, stripe_payouts_enabled")
    .eq("id", p.driver_id)
    .maybeSingle();
  if (!drv?.stripe_account_id || !drv.stripe_payouts_enabled) {
    return { ok: false, skipped: true, error: "El repartidor aún no conectó su cuenta" };
  }

  const cents = Math.round(money(p.amount_usd) * 100);
  if (cents <= 0) {
    await db
      .from("driver_payouts")
      .update({ status: "pagado", paid_at: new Date().toISOString() })
      .eq("id", p.id);
    return { ok: true, skipped: true };
  }

  try {
    const tr = await stripePost<any>(
      "/v1/transfers",
      {
        amount: cents,
        currency: "usd",
        destination: drv.stripe_account_id,
        metadata: { driver_payout_id: p.id, store_order_id: p.order_id },
      },
      env,
      { "Idempotency-Key": `driver-payout-${p.id}-${cents}` },
    );
    await db
      .from("driver_payouts")
      .update({
        status: "pagado",
        transfer_id: tr?.id ?? null,
        paid_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("id", p.id);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error de transferencia";
    console.error("[payouts] transferencia a repartidor fallida", p.id, msg);
    await db
      .from("driver_payouts")
      .update({ status: "fallido", last_error: msg.slice(0, 500) })
      .eq("id", p.id);
    return { ok: false, error: msg };
  }
}
