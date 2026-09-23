/**
 * Pagos al repartidor por cada pedido de tienda entregado.
 *
 * Su parte = envío del tramo que le toca + cargo por peso + 100% de la propina.
 * Si todavía no conectó su cuenta de cobro, el pago queda "pendiente" y se
 * transfiere cuando la conecte (ver /api/public/payout-run).
 */

function money(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Crea (si falta) la fila de pago del repartidor de un pedido entregado. */
export async function registerDriverPayoutForOrder(orderId: string): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const { data: order } = await db
      .from("store_orders")
      .select("id, repartidor_id, envio_repartidor, cargo_peso_repartidor, propina, estado")
      .eq("id", orderId)
      .maybeSingle();
    if (!order?.repartidor_id) return;

    const tier = money(order.envio_repartidor);
    const weight = money(order.cargo_peso_repartidor);
    const tip = money(order.propina);
    const total = Math.round((tier + weight + tip) * 100) / 100;
    if (total <= 0) return;

    await db.from("driver_payouts").upsert(
      {
        driver_id: order.repartidor_id,
        order_id: order.id,
        tier_amount_usd: tier,
        weight_amount_usd: weight,
        tip_amount_usd: tip,
        amount_usd: total,
        status: "pendiente",
      },
      { onConflict: "order_id", ignoreDuplicates: true },
    );
  } catch (e) {
    console.error("[driver-payouts] no se pudo registrar el pago", orderId, e);
  }
}
