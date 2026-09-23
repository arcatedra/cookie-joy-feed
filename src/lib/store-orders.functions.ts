/**
 * Pedidos del marketplace: consulta, avance de la tienda y COBRO final.
 *
 * Regla: al confirmar se reserva (hold) el total + margen; cuando la tienda
 * marca "Listo para recoger" se cobra solo el monto real.
 *  - real < reservado  → se cobra menos, el resto se libera solo (sin reembolso)
 *  - real > reservado  → se cobra el tope y la diferencia queda como ajuste pendiente
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { pricingFromRows, processingFeeCents, tierForSubtotal, weightFeeCents } from "./pricing";

const MAX_CAPTURE_ATTEMPTS = 3;

async function myBusinessId(db: any, userId: string): Promise<string> {
  const { data, error } = await db
    .from("businesses")
    .select("id")
    .eq("owner_user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("No tienes un negocio registrado.");
  return data.id as string;
}

/** Pedidos que le llegan a la tienda del usuario. */
export const listStoreOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = (context as any).supabase;
    const businessId = await myBusinessId(db, (context as any).userId);
    const { data, error } = await db
      .from("store_orders")
      .select("*")
      .eq("business_id", businessId)
      .neq("estado", "pendiente_pago")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    const orders = data ?? [];
    if (orders.length === 0) return [];
    const { data: items, error: itErr } = await db
      .from("store_order_items")
      .select("*")
      .in("order_id", orders.map((o: any) => o.id));
    if (itErr) throw itErr;
    return orders.map((o: any) => ({
      ...o,
      items: (items ?? []).filter((i: any) => i.order_id === o.id),
    }));
  });

/** Detalle de un pedido para el cliente dueño del pedido. */
export const getMyStoreOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const db = (context as any).supabase;
    const { data: order, error } = await db
      .from("store_orders")
      .select("*")
      .eq("id", data.id)
      .eq("cliente_id", (context as any).userId)
      .maybeSingle();
    if (error) throw error;
    if (!order) return null;
    const [{ data: items }, { data: biz }] = await Promise.all([
      db.from("store_order_items").select("*").eq("order_id", order.id),
      db.from("businesses").select("business_name, slug").eq("id", order.business_id).maybeSingle(),
    ]);
    return { order, items: items ?? [], store: biz ?? null };
  });

/** La tienda empieza a preparar el pedido. */
export const startPreparingOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const db = (context as any).supabase;
    const businessId = await myBusinessId(db, (context as any).userId);
    const { error } = await db
      .from("store_orders")
      .update({ estado: "preparando" })
      .eq("id", data.id)
      .eq("business_id", businessId)
      .eq("estado", "confirmado");
    if (error) throw error;
    return { ok: true };
  });

const readyInput = z.object({
  id: z.string().uuid(),
  /** Cantidad realmente recogida de cada artículo (puede ser 0 si faltó). */
  items: z
    .array(z.object({ itemId: z.string().uuid(), cantidadReal: z.number().min(0).max(999) }))
    .max(200)
    .default([]),
});

/**
 * "Listo para recoger": ajusta cantidades reales y COBRA el monto real.
 */
export const markOrderReadyAndCapture = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => readyInput.parse(raw))
  .handler(async ({ data, context }) => {
    const db = (context as any).supabase;
    const userId = (context as any).userId as string;
    const businessId = await myBusinessId(db, userId);

    const { data: order, error: oErr } = await db
      .from("store_orders")
      .select("*")
      .eq("id", data.id)
      .eq("business_id", businessId)
      .maybeSingle();
    if (oErr) throw oErr;
    if (!order) throw new Error("Pedido no encontrado.");
    if (order.estado === "listo" || order.estado === "entregado") {
      return { ok: true, alreadyDone: true as const };
    }
    if (!["confirmado", "preparando", "cobro_fallido"].includes(order.estado)) {
      throw new Error("Este pedido todavía no está pagado.");
    }
    if (!order.stripe_payment_intent_id) {
      throw new Error("Este pedido no tiene una reserva de pago activa.");
    }
    if (Number(order.captura_intentos ?? 0) >= MAX_CAPTURE_ATTEMPTS) {
      throw new Error("El cobro falló varias veces. Soporte de Hazorex debe revisarlo.");
    }

    // 1) Cantidades reales
    const { data: items, error: iErr } = await db
      .from("store_order_items")
      .select("*")
      .eq("order_id", order.id);
    if (iErr) throw iErr;

    const { data: pricingRows } = await db.from("pricing_settings").select("key, value");
    const pricing = pricingFromRows(pricingRows);

    // Pesos de los productos para recalcular el cargo por peso real
    const productIds = (items ?? []).map((i: any) => i.product_id).filter(Boolean);
    const weightById = new Map<string, number>();
    if (productIds.length > 0) {
      const { data: prods } = await db
        .from("store_products")
        .select("id, peso_lb")
        .in("id", productIds);
      for (const p of prods ?? []) {
        weightById.set(p.id, Number(p.peso_lb ?? pricing.defaultProductWeightLb));
      }
    }

    const realById = new Map(data.items.map((i) => [i.itemId, i.cantidadReal]));
    let realSubtotalCents = 0;
    let realLb = 0;
    let realItemCount = 0;
    for (const it of items ?? []) {
      const real = realById.has(it.id) ? Number(realById.get(it.id)) : Number(it.cantidad);
      realSubtotalCents += Math.round(Number(it.precio_unitario) * 100) * real;
      realItemCount += real;
      realLb +=
        (weightById.get(it.product_id) ?? pricing.defaultProductWeightLb) * real;
      if (realById.has(it.id) && real !== Number(it.cantidad_real)) {
        await db.from("store_order_items").update({ cantidad_real: real }).eq("id", it.id);
      }
    }
    realLb = Math.round(realLb * 100) / 100;

    const tier = tierForSubtotal(realSubtotalCents, pricing);
    const shippingCents = tier.feeCents;
    const weightCents = weightFeeCents(realLb, pricing);
    const serviceCents = processingFeeCents(
      realSubtotalCents + shippingCents + weightCents,
      pricing,
    );
    const tipCents = Math.round(Number(order.propina ?? 0) * 100);
    const creditCents = Math.round(Number(order.credito_aplicado ?? 0) * 100);
    const realTotalCents = Math.max(
      0,
      realSubtotalCents + shippingCents + weightCents + serviceCents + tipCents - creditCents,
    );
    const authorizedCents = Math.round(Number(order.monto_autorizado ?? 0) * 100);
    if (authorizedCents <= 0) throw new Error("La reserva del pago no es válida.");

    // 2) Tope: nunca se cobra más de lo reservado
    const captureCents = Math.min(realTotalCents, authorizedCents);
    const pendingAdjustmentCents = Math.max(realTotalCents - authorizedCents, 0);


    // 3) Cobro en Stripe (idempotente por pedido + monto)
    const { paymentsEnvironmentForHost, stripeCapturePaymentIntent } = await import(
      "./stripe.server"
    );
    const env = paymentsEnvironmentForHost(getRequestHost());

    try {
      await stripeCapturePaymentIntent(
        order.stripe_payment_intent_id,
        captureCents,
        `store-capture-${order.id}-${captureCents}`,
        env,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error de cobro";
      console.error("[store-orders] captura fallida", order.id, msg);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await (supabaseAdmin as any)
        .from("store_orders")
        .update({
          estado: "cobro_fallido",
          captura_intentos: Number(order.captura_intentos ?? 0) + 1,
          captura_error: msg.slice(0, 500),
        })
        .eq("id", order.id);
      throw new Error(
        "No se pudo cobrar el pedido. Vuelve a intentarlo; si sigue fallando, avisa a soporte.",
      );
    }

    // 4) Montos y comisión definitiva (solo el sistema puede escribirlos)
    const commissionPct = Number(order.comision_porcentaje ?? 15);
    const commissionFinal = Math.round((realSubtotalCents * commissionPct) / 100) / 100;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: upErr } = await (supabaseAdmin as any)
      .from("store_orders")
      .update({
        estado: "listo",
        monto_capturado: captureCents / 100,
        comision_final: commissionFinal,
        ajuste_pendiente: pendingAdjustmentCents / 100,
        cargo_servicio: serviceCents / 100,
        costo_envio: shippingCents / 100,
        tramo: tier.tier,
        envio_repartidor: tier.driverCents / 100,
        envio_empresa: tier.companyCents / 100,
        cargo_peso: weightCents / 100,
        cargo_peso_repartidor: weightCents / 100,
        peso_total_lb: realLb,
        capturado_en: new Date().toISOString(),
        captura_error: null,
      })
      .eq("id", order.id);
    if (upErr) console.error("[store-orders] no se pudo guardar el cobro", upErr);

    return {
      ok: true as const,
      cobrado: captureCents / 100,
      reservado: authorizedCents / 100,
      ajustePendiente: pendingAdjustmentCents / 100,
      comision: commissionFinal,
    };
  });

/** La tienda marca el pedido como entregado/recogido. */
export const markOrderDelivered = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const db = (context as any).supabase;
    const businessId = await myBusinessId(db, (context as any).userId);
    const { data: updated, error } = await db
      .from("store_orders")
      .update({ estado: "entregado" })
      .eq("id", data.id)
      .eq("business_id", businessId)
      .eq("estado", "listo")
      .select("id");
    if (error) throw error;
    if (!updated || updated.length === 0) {
      throw new Error("Este pedido no está listo para marcarse como entregado.");
    }

    // Bono de referido: primera compra entregada del invitado.
    const { grantReferralRewardForOrder } = await import("./referral-rewards.server");
    await grantReferralRewardForOrder(data.id);
    // Pago del repartidor: su parte del tramo + peso + 100% de la propina.
    const { registerDriverPayoutForOrder } = await import("./driver-payouts.server");
    await registerDriverPayoutForOrder(data.id);
    return { ok: true };
  });

/** Cancela el pedido y libera la reserva sin cobrar nada. */
export const cancelStoreOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const db = (context as any).supabase;
    const userId = (context as any).userId as string;

    const { data: order } = await db
      .from("store_orders")
      .select("id, estado, cliente_id, business_id, stripe_payment_intent_id, credito_aplicado")
      .eq("id", data.id)
      .maybeSingle();
    if (!order) throw new Error("Pedido no encontrado.");

    const { data: biz } = await db
      .from("businesses")
      .select("id")
      .eq("id", order.business_id)
      .eq("owner_user_id", userId)
      .maybeSingle();
    if (order.cliente_id !== userId && !biz) throw new Error("No puedes cancelar este pedido.");
    if (["listo", "entregado", "cancelado"].includes(order.estado)) {
      throw new Error("Este pedido ya no se puede cancelar.");
    }

    if (order.stripe_payment_intent_id) {
      const { paymentsEnvironmentForHost, stripeCancelPaymentIntent } = await import(
        "./stripe.server"
      );
      try {
        await stripeCancelPaymentIntent(
          order.stripe_payment_intent_id,
          `store-cancel-${order.id}`,
          paymentsEnvironmentForHost(getRequestHost()),
        );
      } catch (e) {
        console.error("[store-orders] no se pudo liberar la reserva", e);
      }
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any)
      .from("store_orders")
      .update({ estado: "cancelado" })
      .eq("id", order.id);

    // Devuelve el saldo solo si realmente se llegó a descontar (pago confirmado)
    // y si no se devolvió antes.
    if (Number(order.credito_aplicado ?? 0) > 0) {
      const [{ data: used }, { data: returned }] = await Promise.all([
        (supabaseAdmin as any)
          .from("wallet_credits")
          .select("id")
          .eq("order_id", order.id)
          .eq("reason", "uso_en_pedido")
          .maybeSingle(),
        (supabaseAdmin as any)
          .from("wallet_credits")
          .select("id")
          .eq("order_id", order.id)
          .eq("reason", "devolucion_saldo")
          .maybeSingle(),
      ]);
      if (used && !returned) {
        await (supabaseAdmin as any).from("wallet_credits").insert({
          user_id: order.cliente_id,
          amount_usd: Number(order.credito_aplicado),
          reason: "devolucion_saldo",
          order_id: order.id,
        });
      }
    }

    return { ok: true };
  });
