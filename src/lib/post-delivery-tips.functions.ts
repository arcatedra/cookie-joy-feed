import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPostTipAllowed, POST_TIP_WINDOW_MS } from "./cookie-order-rules";

const kindSchema = z.enum(["cookie", "store"]);

/** Estado de la propina extra de un pedido del cliente. */
export const getPostTipPrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ kind: kindSchema, orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { loadDeliveredOrder } = await import("./post-delivery-tips.server");
    const order = await loadDeliveredOrder(data.kind, data.orderId);
    if (!order || order.clienteId !== context.userId) return { eligible: false as const, tips: [] as Array<{ amount: number; status: string; paidAt: string | null }>, deadline: null };
    const { data: tips } = await context.supabase.from("post_delivery_tips" as any).select("amount,status,paid_at").eq("order_id", data.orderId).eq("kind", data.kind).order("created_at");
    const deliveredMs = order.deliveredAt ? new Date(order.deliveredAt).getTime() : NaN;
    const deadline = Number.isFinite(deliveredMs) ? new Date(deliveredMs + POST_TIP_WINDOW_MS).toISOString() : null;
    const eligible = !!order.driverId && !!order.env && Number.isFinite(deliveredMs) && Date.now() - deliveredMs <= POST_TIP_WINDOW_MS;
    return {
      eligible,
      deadline,
      tips: ((tips ?? []) as any[]).map((t) => ({ amount: Number(t.amount), status: String(t.status), paidAt: t.paid_at ?? null })),
    };
  });

/** Pedidos del cliente que todavía pueden recibir propina extra (para la lista "Mis pedidos"). */
export const listMyTipPrompts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const since = new Date(Date.now() - POST_TIP_WINDOW_MS).toISOString();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const [{ data: cookies }, { data: stores }] = await Promise.all([
      db.from("route_stops").select("order_id,delivered_at,pedidos!inner(cliente_id,numero_pedido)").eq("status", "entregado").gte("delivered_at", since).eq("pedidos.cliente_id", context.userId).limit(20),
      db.from("store_orders").select("id,numero_pedido,entregado_en").eq("cliente_id", context.userId).eq("estado", "entregado").gte("entregado_en", since).limit(20),
    ]);
    return [
      ...((cookies ?? []) as any[]).map((r) => ({ kind: "cookie" as const, orderId: r.order_id as string, numero: String(r.pedidos?.numero_pedido ?? ""), deliveredAt: r.delivered_at as string })),
      ...((stores ?? []) as any[]).map((r) => ({ kind: "store" as const, orderId: r.id as string, numero: String(r.numero_pedido ?? ""), deliveredAt: r.entregado_en as string })),
    ];
  });

/**
 * Cobra la propina extra. Con tarjeta guardada se cobra al confirmar; si no hay
 * tarjeta o el banco pide verificación, devuelve un pago de Stripe solo por la propina.
 */
export const createPostDeliveryTip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    kind: kindSchema,
    orderId: z.string().uuid(),
    amount: z.number().finite(),
    requestId: z.string().uuid(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { loadDeliveredOrder, resolveStripeCustomer, finalizePostDeliveryTip, orderPathFor } = await import("./post-delivery-tips.server");
    const order = await loadDeliveredOrder(data.kind, data.orderId);
    if (!order || order.clienteId !== context.userId) throw new Error("Pedido no encontrado.");
    if (!order.driverId) throw new Error("Este pedido no tiene repartidor asignado.");
    if (!order.env) throw new Error("Este pedido no tiene un pago verificado.");
    assertPostTipAllowed(data.amount, order.deliveredAt);
    const env = order.env;
    const cents = Math.round(data.amount * 100);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    // Una fila por toque (requestId): reintentos del mismo toque nunca cobran dos veces.
    let { data: tip } = await db.from("post_delivery_tips").select("*").eq("order_id", data.orderId).eq("request_id", data.requestId).maybeSingle();
    if (!tip) {
      const ins = await db.from("post_delivery_tips").insert({
        kind: data.kind, order_id: data.orderId, cliente_id: context.userId, driver_id: order.driverId,
        request_id: data.requestId, amount: cents / 100, stripe_environment: env, status: "pendiente",
      }).select("*").single();
      if (ins.error) throw new Error("No se pudo registrar la propina.");
      tip = ins.data;
    }
    if (tip.status === "pagado") return { status: "paid" as const };

    const { stripeGet, stripePost } = await import("./stripe.server");
    const metadata = { kind: "post_delivery_tip", tip_id: tip.id, order_kind: data.kind, order_id: data.orderId, driver_id: order.driverId };
    const description = `HAZOREX propina extra ${order.numero}`;

    // 1) Tarjeta guardada en el pago original (si el cliente la dejó guardar).
    let customer: string | null = null;
    try {
      if (order.paymentIntentId) {
        const pi = await stripeGet<any>(`/v1/payment_intents/${order.paymentIntentId}`, env);
        customer = typeof pi?.customer === "string" ? pi.customer : pi?.customer?.id ?? null;
        const pm = typeof pi?.payment_method === "string" ? pi.payment_method : pi?.payment_method?.id ?? null;
        if (customer && pm && pi?.setup_future_usage === "off_session") {
          const charged = await stripePost<any>("/v1/payment_intents", {
            amount: cents, currency: "usd", customer, payment_method: pm, off_session: true, confirm: true,
            description, metadata, transfer_group: `post-tip-${tip.id}`,
          }, env, { "Idempotency-Key": `post-tip-charge-${tip.id}` });
          if (charged?.status === "succeeded") {
            await db.from("post_delivery_tips").update({ payment_intent_id: charged.id }).eq("id", tip.id);
            await finalizePostDeliveryTip(tip.id, charged.id, env);
            return { status: "paid" as const };
          }
        }
      }
    } catch (e) {
      console.warn("[post-tip] cobro con tarjeta guardada no completado; se pedirá pago", tip.id, e instanceof Error ? e.message : e);
    }

    // 2) Pago nuevo solo por la propina.
    const host = getRequestHost();
    const origin = `${host?.startsWith("localhost") ? "http" : "https"}://${host}`;
    if (!customer) customer = await resolveStripeCustomer(env, context.userId, (context as any).claims?.email).catch(() => null);
    try {
      const session = await stripePost<any>("/v1/checkout/sessions", {
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: `${origin}${orderPathFor(data.kind, data.orderId)}${data.kind === "store" ? "?" : "&"}propina_ok=1`,
        ...(customer ? { customer } : {}),
        line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: cents, product_data: { name: "Propina para tu repartidor (100%)" } } }],
        payment_intent_data: { description, metadata, transfer_group: `post-tip-${tip.id}` },
        metadata,
      }, env, { "Idempotency-Key": `post-tip-session-${tip.id}` });
      await db.from("post_delivery_tips").update({ status: "requiere_pago", checkout_session_id: session.id }).eq("id", tip.id).neq("status", "pagado");
      if (!session?.client_secret) throw new Error("Stripe no devolvió el pago.");
      return { status: "needs_payment" as const, clientSecret: session.client_secret as string };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      console.error("[post-tip] no se pudo abrir el pago", tip.id, msg);
      await db.from("post_delivery_tips").update({ status: "fallido", last_error: msg.slice(0, 500) }).eq("id", tip.id).neq("status", "pagado");
      return { status: "error" as const, error: "No se pudo abrir el pago de la propina. Inténtalo de nuevo." };
    }
  });
