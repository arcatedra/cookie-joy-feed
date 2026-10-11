/**
 * Propina extra después de la entrega (galletas y tiendas). Solo servidor.
 * El dinero va 100% al repartidor con una transferencia ligada al cobro de la propina.
 */
import type { StripeEnv } from "./stripe.server";

export type TipKind = "cookie" | "store";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

/** Busca (por metadata userId) o crea el cliente de Stripe. Nunca toca la tabla de clientes. */
export async function resolveStripeCustomer(env: StripeEnv, userId: string, email?: string): Promise<string | null> {
  if (!UUID_RE.test(userId)) return null;
  const { stripeGet, stripePost } = await import("./stripe.server");
  const query = encodeURIComponent(`metadata['userId']:'${userId}'`);
  const found = await stripeGet<any>(`/v1/customers/search?query=${query}&limit=1`, env);
  if (found?.data?.[0]?.id) return found.data[0].id as string;
  const created = await stripePost<any>(
    "/v1/customers",
    { ...(email ? { email } : {}), metadata: { userId } },
    env,
    { "Idempotency-Key": `hazorex-customer-${env}-${userId}` },
  );
  return (created?.id as string) ?? null;
}

export interface DeliveredOrder {
  kind: TipKind;
  orderId: string;
  clienteId: string;
  driverId: string | null;
  deliveredAt: string | null;
  env: StripeEnv | null;
  paymentIntentId: string | null;
  numero: string;
}

/** Datos de entrega verificados desde la base (no desde el navegador). */
export async function loadDeliveredOrder(kind: TipKind, orderId: string): Promise<DeliveredOrder | null> {
  const db = await admin();
  if (kind === "cookie") {
    const { data: o } = await db.from("pedidos").select("id,cliente_id,stripe_environment,stripe_payment_intent_id,numero_pedido").eq("id", orderId).maybeSingle();
    if (!o) return null;
    const { data: stops } = await db.from("route_stops").select("delivered_at,updated_at,delivery_routes!inner(driver_id)").eq("order_id", orderId).eq("status", "entregado").limit(1);
    const stop = stops?.[0];
    return {
      kind, orderId, clienteId: o.cliente_id, numero: String(o.numero_pedido ?? ""),
      driverId: stop?.delivery_routes?.driver_id ?? null,
      deliveredAt: stop ? (stop.delivered_at ?? stop.updated_at) : null,
      env: o.stripe_environment === "sandbox" || o.stripe_environment === "live" ? o.stripe_environment : null,
      paymentIntentId: o.stripe_payment_intent_id ?? null,
    };
  }
  const { data: o } = await db.from("store_orders").select("id,cliente_id,stripe_environment,stripe_payment_intent_id,numero_pedido,estado,entregado_en,repartidor_id").eq("id", orderId).maybeSingle();
  if (!o) return null;
  let driverId: string | null = o.repartidor_id ?? null;
  if (!driverId) {
    const { data: bs } = await db.from("delivery_block_stops").select("delivery_blocks!inner(assigned_driver_id)").eq("store_order_id", orderId).limit(1);
    driverId = bs?.[0]?.delivery_blocks?.assigned_driver_id ?? null;
  }
  return {
    kind, orderId, clienteId: o.cliente_id, numero: String(o.numero_pedido ?? ""), driverId,
    deliveredAt: o.estado === "entregado" ? (o.entregado_en ?? null) : null,
    env: o.stripe_environment === "sandbox" || o.stripe_environment === "live" ? o.stripe_environment : null,
    paymentIntentId: o.stripe_payment_intent_id ?? null,
  };
}

export function orderPathFor(kind: TipKind, orderId: string) {
  return kind === "store" ? `/mis-pedidos/tienda/${orderId}` : `/mis-pedidos?propina=${orderId}`;
}

/** Aviso al cliente: "¡Tu pedido llegó!" con enlace para dejar o subir la propina. */
export async function notifyTipPrompt(kind: TipKind, orderId: string) {
  try {
    const order = await loadDeliveredOrder(kind, orderId);
    if (!order?.deliveredAt) return;
    const vapidPublic = process.env["VAPID_PUBLIC_KEY"];
    const vapidPrivate = process.env["VAPID_PRIVATE_KEY"];
    if (!vapidPublic || !vapidPrivate) return;
    const db = await admin();
    const { data: subs } = await db.from("push_subscriptions").select("id,endpoint,p256dh,auth").eq("user_id", order.clienteId);
    if (!subs?.length) return;
    const { buildPushPayload } = await import("@block65/webcrypto-web-push");
    const vapid = { subject: process.env["VAPID_SUBJECT"] ?? "mailto:hazorex0@gmail.com", publicKey: vapidPublic, privateKey: vapidPrivate };
    const url = `https://www.hazorex.com${orderPathFor(kind, orderId)}`;
    await Promise.all(subs.map(async (sub: any) => {
      try {
        const payload = await buildPushPayload(
          { data: { title: "¡Tu pedido llegó!", body: "¿Quieres dejar o subir la propina a tu repartidor?", url, tag: `tip-${orderId}` }, options: { ttl: 86400, urgency: "normal" as const } },
          { endpoint: sub.endpoint, expirationTime: null, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          vapid,
        );
        const res = await fetch(sub.endpoint, { method: payload.method, headers: payload.headers, body: payload.body.buffer.slice(payload.body.byteOffset, payload.body.byteOffset + payload.body.byteLength) as ArrayBuffer });
        if (res.status === 404 || res.status === 410) await db.from("push_subscriptions").delete().eq("id", sub.id);
      } catch (e) { console.warn("[post-tip] push falló", e); }
    }));
  } catch (e) {
    console.error("[post-tip] aviso falló", orderId, e);
  }
}

/**
 * Confirma una propina cobrada (idempotente): verifica el cobro en Stripe,
 * la marca pagada, registra el pago del repartidor y lo transfiere.
 */
export async function finalizePostDeliveryTip(tipId: string, paymentIntentId: string, env: StripeEnv) {
  const db = await admin();
  const { data: tip } = await db.from("post_delivery_tips").select("*").eq("id", tipId).maybeSingle();
  if (!tip) return { ok: false, error: "Propina no encontrada" };
  if (tip.stripe_environment !== env) return { ok: false, error: "Ambiente distinto" };
  if (tip.status !== "pagado") {
    const { stripeGet } = await import("./stripe.server");
    const pi = await stripeGet<any>(`/v1/payment_intents/${paymentIntentId}`, env);
    const cents = Math.round(Number(tip.amount) * 100);
    if (pi?.status !== "succeeded" || Number(pi?.amount_received) !== cents || pi?.metadata?.tip_id !== tip.id) {
      return { ok: false, error: "El cobro de la propina no coincide" };
    }
    const charge = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id ?? null;
    await db.from("post_delivery_tips").update({ status: "pagado", payment_intent_id: paymentIntentId, charge_id: charge, paid_at: new Date().toISOString(), last_error: null }).eq("id", tip.id).neq("status", "pagado");
  }
  const amount = Number(tip.amount);
  await db.from("driver_payouts").upsert(
    { driver_id: tip.driver_id, post_tip_id: tip.id, tier_amount_usd: 0, weight_amount_usd: 0, tip_amount_usd: amount, amount_usd: amount, status: "pendiente" },
    { onConflict: "post_tip_id", ignoreDuplicates: true },
  );
  const { data: payout } = await db.from("driver_payouts").select("id,status").eq("post_tip_id", tip.id).maybeSingle();
  if (payout && payout.status !== "pagado") {
    const { transferDriverPayout } = await import("./payouts.server");
    await transferDriverPayout(payout.id);
  }
  return { ok: true };
}
