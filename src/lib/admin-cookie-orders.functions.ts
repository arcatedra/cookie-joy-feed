/** Admin de pedidos de galletas: lista, cambios de estado, cancelación y reembolso. Solo administradores. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAction, cookieDeliveryDate, COOKIE_STATUS_LABEL } from "./admin-cookie-order-rules";

async function assertAdmin(db: any, userId: string) {
  const { data, error } = await db.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || data !== true) throw new Error("Solo administradores.");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

const PUSH_TEXT: Record<string, string> = {
  preparando: "Estamos preparando tus galletas.",
  listo: "Tus galletas están listas para salir.",
  entregado: "Tu pedido de galletas fue entregado.",
  cancelado: "Tu pedido de galletas fue cancelado.",
  reembolsado: "Te devolvimos el dinero de tu pedido de galletas.",
};

async function notifyCustomer(db: any, clienteId: string, orderId: string, estado: string) {
  try {
    const vapidPublic = process.env["VAPID_PUBLIC_KEY"];
    const vapidPrivate = process.env["VAPID_PRIVATE_KEY"];
    if (!vapidPublic || !vapidPrivate || !PUSH_TEXT[estado]) return;
    const { data: subs } = await db.from("push_subscriptions").select("id,endpoint,p256dh,auth").eq("user_id", clienteId);
    if (!subs?.length) return;
    const { buildPushPayload } = await import("@block65/webcrypto-web-push");
    const vapid = { subject: process.env["VAPID_SUBJECT"] ?? "mailto:hazorex0@gmail.com", publicKey: vapidPublic, privateKey: vapidPrivate };
    await Promise.all(subs.map(async (sub: any) => {
      try {
        const payload = await buildPushPayload(
          { data: { title: "Hazorex Galletas", body: PUSH_TEXT[estado], url: "https://www.hazorex.com/mis-pedidos", tag: `cookie-${orderId}` }, options: { ttl: 86400, urgency: "normal" as const } },
          { endpoint: sub.endpoint, expirationTime: null, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          vapid,
        );
        const res = await fetch(sub.endpoint, { method: payload.method, headers: payload.headers, body: payload.body.buffer.slice(payload.body.byteOffset, payload.body.byteOffset + payload.body.byteLength) as ArrayBuffer });
        if (res.status === 404 || res.status === 410) await db.from("push_subscriptions").delete().eq("id", sub.id);
      } catch (e) { console.warn("[admin-galletas] push falló", e); }
    }));
  } catch (e) { console.error("[admin-galletas] aviso falló", orderId, e); }
}

export type CookieAdminOrder = {
  id: string; numero: string; creadoEn: string; estado: string; monto_capturado: number | null; capturadoEn: string | null;
  cliente: { nombre: string; telefono: string; email: string };
  direccion: Record<string, string | null>;
  entrega: string;
  items: { nombre: string; cantidad: number }[];
  subtotal: number; envio: number; propina: number; total: number;
  historial: { de: string | null; a: string; nota: string | null; en: string; por: string }[];
};

export const adminListCookieOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ pedidos: CookieAdminOrder[] }> => {
    await assertAdmin((context as any).supabase, (context as any).userId);
    const db = await admin();
    const { data: orders, error } = await db.from("pedidos")
      .select("id,numero_pedido,creado_en,cliente_id,direccion_envio,subtotal,costo_envio,propina,total,estado,monto_capturado,capturado_en,stripe_environment")
      .order("creado_en", { ascending: false }).limit(500);
    if (error) throw new Error("No se pudieron cargar los pedidos.");
    const ids = (orders ?? []).map((o: any) => o.id);
    const clienteIds = [...new Set((orders ?? []).map((o: any) => o.cliente_id))];
    const [{ data: items }, { data: clientes }, { data: events }] = await Promise.all([
      ids.length ? db.from("pedido_items").select("pedido_id,nombre_producto,cantidad").in("pedido_id", ids) : { data: [] },
      clienteIds.length ? db.from("clientes").select("id,nombre_completo,telefono,email").in("id", clienteIds) : { data: [] },
      ids.length ? db.from("pedido_status_events").select("pedido_id,from_estado,to_estado,actor_id,nota,created_at").in("pedido_id", ids).order("created_at") : { data: [] },
    ]);
    const actorIds = [...new Set((events ?? []).map((e: any) => e.actor_id).filter(Boolean))];
    const { data: actors } = actorIds.length ? await db.rpc("get_public_profiles", { ids: actorIds }) : { data: [] };
    const actorName = new Map((actors ?? []).map((a: any) => [a.id, a.display_name]));
    const cMap = new Map((clientes ?? []).map((c: any) => [c.id, c]));
    return {
      pedidos: (orders ?? []).map((o: any) => {
        const c: any = cMap.get(o.cliente_id) ?? {};
        return {
          id: o.id, numero: o.numero_pedido, creadoEn: o.creado_en, estado: o.estado,
          monto_capturado: o.monto_capturado == null ? null : Number(o.monto_capturado),
          capturadoEn: o.capturado_en,
          cliente: { nombre: c.nombre_completo ?? "—", telefono: c.telefono ?? "", email: c.email ?? "" },
          direccion: o.direccion_envio ?? {},
          entrega: cookieDeliveryDate(o.creado_en),
          items: (items ?? []).filter((i: any) => i.pedido_id === o.id).map((i: any) => ({ nombre: i.nombre_producto, cantidad: i.cantidad })),
          subtotal: Number(o.subtotal ?? 0), envio: Number(o.costo_envio ?? 0), propina: Number(o.propina ?? 0), total: Number(o.total ?? 0),
          historial: (events ?? []).filter((e: any) => e.pedido_id === o.id).map((e: any) => ({
            de: e.from_estado, a: e.to_estado, nota: e.nota, en: e.created_at, por: String(actorName.get(e.actor_id) ?? "Admin"),
          })),
        };
      }),
    };
  });

export const adminCookieOrderAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({
    id: z.string().uuid(),
    action: z.enum(["preparando", "listo", "entregado", "cancelar", "reembolsar"]),
  }).parse(raw))
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string;
    await assertAdmin((context as any).supabase, userId);
    const db = await admin();
    const { data: o, error } = await db.from("pedidos")
      .select("id,estado,cliente_id,monto_capturado,stripe_environment,stripe_checkout_session_id,stripe_payment_intent_id")
      .eq("id", data.id).maybeSingle();
    if (error || !o) throw new Error("Pedido no encontrado.");
    assertAction(o, data.action);
    const env = o.stripe_environment;
    let to: string = data.action;
    let nota: string | null = null;

    if (data.action === "cancelar") {
      to = "cancelado";
      const { stripeGet, stripePost, stripeCancelPaymentIntent } = await import("./stripe.server");
      if (o.stripe_checkout_session_id && (env === "sandbox" || env === "live")) {
        const s = await stripeGet<{ status: string }>(`/v1/checkout/sessions/${o.stripe_checkout_session_id}`, env);
        if (s.status === "complete" && Number(o.monto_capturado ?? 0) > 0) throw new Error("Este pedido ya se cobró: usa Reembolsar.");
        if (s.status === "open") await stripePost(`/v1/checkout/sessions/${o.stripe_checkout_session_id}/expire`, {}, env, { "Idempotency-Key": `expire-cookie-${o.id}` });
        nota = s.status === "open" ? "Sesión de pago de Stripe cerrada" : null;
      }
      if (o.estado === "autorizado" && o.stripe_payment_intent_id && (env === "sandbox" || env === "live")) {
        await stripeCancelPaymentIntent(o.stripe_payment_intent_id, `cancel-cookie-${o.id}`, env);
        nota = "Reserva de la tarjeta liberada";
      }
    }

    if (data.action === "reembolsar") {
      to = "reembolsado";
      if (!o.stripe_payment_intent_id || (env !== "sandbox" && env !== "live")) throw new Error("Este pedido no tiene un cobro de Stripe para reembolsar.");
      const { stripePost } = await import("./stripe.server");
      const refund = await stripePost<{ id: string; amount: number }>("/v1/refunds",
        { payment_intent: o.stripe_payment_intent_id, metadata: { cookie_order_id: o.id, admin_id: userId } },
        env, { "Idempotency-Key": `refund-cookie-${o.id}` });
      nota = `Reembolso ${refund.id} por $${(refund.amount / 100).toFixed(2)}`;
    }

    const { data: saved, error: saveErr } = await db.from("pedidos").update({ estado: to }).eq("id", o.id).eq("estado", o.estado).select("id");
    if (saveErr || !saved?.length) throw new Error("El pedido cambió mientras tanto. Actualiza la lista.");
    await db.from("pedido_status_events").insert({ pedido_id: o.id, from_estado: o.estado, to_estado: to, actor_id: userId, nota });
    if (to === "cancelado" && !(Number(o.monto_capturado ?? 0) > 0)) {
      const { releaseOrderCredit } = await import("./order-credit.server");
      await releaseOrderCredit(db, "cookie", o.id).catch((e) => console.error("[admin-galletas] saldo", e));
    }
    if (to === "entregado") {
      const { notifyTipPrompt } = await import("./post-delivery-tips.server");
      await notifyTipPrompt("cookie", o.id);
    } else {
      await notifyCustomer(db, o.cliente_id, o.id, to);
    }
    return { estado: to, label: COOKIE_STATUS_LABEL[to] ?? to };
  });
