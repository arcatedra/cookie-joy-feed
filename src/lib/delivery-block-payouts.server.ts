import { adminDb, chargeIdForStoreOrder, environmentForStoreOrder, money, type TransferResult } from "./payouts.server";

type StripeEnv = import("./stripe.server").StripeEnv;

export async function registerDeliveryBlockPayout(blockId: string, db = adminDb()): Promise<string> {
  const { data: block, error } = await db
    .from("delivery_blocks")
    .select("id,assigned_driver_id,status,accepted_pay,committed_pay,tips_total,door_bonus_enabled,door_bonus_amount,payout_id")
    .eq("id", blockId)
    .maybeSingle();
  if (error || !block) throw new Error(error?.message ?? "Lote no encontrado");
  if (!block.assigned_driver_id) throw new Error("El lote no tiene repartidor asignado");
  if (block.status !== "completed") throw new Error("El lote todavía no está completado");
  if (block.payout_id) return block.payout_id as string;

  const committed = money(block.accepted_pay ?? block.committed_pay);
  const door = block.door_bonus_enabled ? money(block.door_bonus_amount) : 0;
  const tips = money(block.tips_total);
  const base = Math.max(0, committed - door);
  const amount = Math.round((committed + tips) * 100) / 100;

  const { data: payout, error: payoutError } = await db
    .from("driver_payouts")
    .upsert({
      driver_id: block.assigned_driver_id,
      block_id: block.id,
      tier_amount_usd: base,
      weight_amount_usd: door,
      tip_amount_usd: tips,
      amount_usd: amount,
      status: "pendiente",
    }, { onConflict: "block_id", ignoreDuplicates: true })
    .select("id")
    .maybeSingle();
  if (payoutError) throw new Error(payoutError.message);

  let payoutId = payout?.id as string | undefined;
  if (!payoutId) {
    const { data: existing } = await db.from("driver_payouts").select("id").eq("block_id", block.id).single();
    payoutId = existing?.id as string | undefined;
  }
  if (!payoutId) throw new Error("No se pudo registrar el pago del lote");
  await db.from("delivery_blocks").update({ payout_id: payoutId, payout_status: "pending" }).eq("id", block.id);
  return payoutId;
}

export async function transferDeliveryBlockPayout(payoutId: string, db = adminDb()): Promise<TransferResult> {
  const { stripePost } = await import("./stripe.server");
  const { data: payout } = await db
    .from("driver_payouts")
    .select("id,driver_id,block_id,amount_usd,status")
    .eq("id", payoutId)
    .maybeSingle();
  if (!payout?.block_id) return { ok: false, error: "Pago de lote no encontrado" };
  if (payout.status === "pagado") return { ok: true, skipped: true };

  const { data: driver } = await db
    .from("drivers")
    .select("stripe_account_id,stripe_payouts_enabled,stripe_environment")
    .eq("id", payout.driver_id)
    .maybeSingle();
  if (!driver?.stripe_account_id || !driver.stripe_payouts_enabled) {
    return { ok: false, skipped: true, error: "El repartidor aún no conectó su cuenta" };
  }

  const { data: stops, error: stopsError } = await db
    .from("delivery_block_stops")
    .select("store_order_id,store_orders!inner(monto_capturado,stripe_environment)")
    .eq("block_id", payout.block_id)
    .order("sequence_number");
  if (stopsError || !stops?.length) return { ok: false, error: stopsError?.message ?? "El lote no tiene pedidos" };

  const orderIds = stops.map((stop: any) => stop.store_order_id as string);
  const environments = new Set(stops.map((stop: any) => stop.store_orders?.stripe_environment));
  if (environments.size !== 1 || !environments.has(driver.stripe_environment)) {
    return { ok: false, error: "Los pedidos y la cuenta pertenecen a ambientes distintos" };
  }
  if (stops.some((stop: any) => money(stop.store_orders?.monto_capturado) <= 0)) {
    return { ok: false, error: "Todos los pedidos del lote deben estar cobrados" };
  }

  const env = await environmentForStoreOrder(orderIds[0], db) as StripeEnv;
  const totalCents = Math.round(money(payout.amount_usd) * 100);
  const totalCapturedCents = stops.reduce((sum: number, stop: any) => sum + Math.round(money(stop.store_orders?.monto_capturado) * 100), 0);
  if (totalCapturedCents < totalCents) {
    return { ok: false, error: "Los cobros del lote no cubren el pago comprometido" };
  }

  let remaining = totalCents;
  let paidCents = 0;
  let firstTransferId: string | null = null;
  try {
    for (const orderId of orderIds) {
      if (remaining <= 0) break;
      const { data: order } = await db.from("store_orders").select("monto_capturado").eq("id", orderId).single();
      const partCents = Math.min(remaining, Math.round(money(order?.monto_capturado) * 100));
      if (partCents <= 0) continue;
      const operationKey = `block-payout-${payout.id}-${orderId}`;
      const { data: existing } = await db.from("delivery_block_payout_parts").select("id,status,amount_usd,transfer_id").eq("operation_key", operationKey).maybeSingle();
      if (existing?.status === "paid") {
        const already = Math.round(money(existing.amount_usd) * 100);
        remaining -= already;
        paidCents += already;
        firstTransferId = firstTransferId ?? existing.transfer_id ?? null;
        continue;
      }
      const charge = await chargeIdForStoreOrder(orderId, db);
      if (!charge) throw new Error(`El pedido ${orderId} todavía no tiene cargo`);
      const tr = await stripePost<any>("/v1/transfers", {
        amount: partCents,
        currency: "usd",
        destination: driver.stripe_account_id,
        source_transaction: charge,
        metadata: { driver_payout_id: payout.id, delivery_block_id: payout.block_id, store_order_id: orderId },
      }, env, { "Idempotency-Key": operationKey });
      await db.from("delivery_block_payout_parts").upsert({
        payout_id: payout.id,
        block_id: payout.block_id,
        store_order_id: orderId,
        component: "block_payment",
        amount_usd: partCents / 100,
        operation_key: operationKey,
        status: "paid",
        transfer_id: tr?.id ?? null,
        last_error: null,
        paid_at: new Date().toISOString(),
      }, { onConflict: "operation_key" });
      firstTransferId = firstTransferId ?? tr?.id ?? null;
      remaining -= partCents;
      paidCents += partCents;
    }
    if (paidCents !== totalCents || remaining !== 0) throw new Error("El pago del lote quedó incompleto");
    await db.from("driver_payouts").update({ status: "pagado", transfer_id: firstTransferId, paid_at: new Date().toISOString(), last_error: null }).eq("id", payout.id);
    await db.from("delivery_blocks").update({ payout_status: "paid" }).eq("id", payout.block_id);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error de transferencia";
    await db.from("driver_payouts").update({ status: "fallido", last_error: message.slice(0, 500) }).eq("id", payout.id);
    await db.from("delivery_blocks").update({ payout_status: "failed" }).eq("id", payout.block_id);
    return { ok: false, error: message };
  }
}

export async function registerAndTransferDeliveryBlock(blockId: string, db = adminDb()) {
  const payoutId = await registerDeliveryBlockPayout(blockId, db);
  return transferDeliveryBlockPayout(payoutId, db);
}