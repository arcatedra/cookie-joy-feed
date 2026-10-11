import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { QUICK_MESSAGE_KEYS, quickMessageText, type QuickMessageKey } from "./driver-quick-messages";
import { checkMessageForContacts, CONTACT_BLOCK_MESSAGE } from "./contact-filter";

const uuid = z.string().uuid();

async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Solo un administrador puede hacer este cambio.");
}

async function adminDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function sendCustomerPush(customerId: string, body: string, orderId: string) {
  try {
    const vapidPublic = process.env["VAPID_PUBLIC_KEY"];
    const vapidPrivate = process.env["VAPID_PRIVATE_KEY"];
    if (!vapidPublic || !vapidPrivate) return;
    const db = await adminDb();
    const { data: subs } = await db.from("push_subscriptions").select("id,endpoint,p256dh,auth").eq("user_id", customerId);
    if (!subs?.length) return;
    const { buildPushPayload } = await import("@block65/webcrypto-web-push");
    const vapid = { subject: process.env["VAPID_SUBJECT"] ?? "mailto:hazorex0@gmail.com", publicKey: vapidPublic, privateKey: vapidPrivate };
    await Promise.all(subs.map(async (sub: any) => {
      try {
        const payload = await buildPushPayload({ data: { title: "Tu repartidor", body, url: `https://www.hazorex.com/mis-pedidos/tienda/${orderId}`, tag: `block-${orderId}` }, options: { ttl: 1800, urgency: "high" as const } }, { endpoint: sub.endpoint, expirationTime: null, keys: { p256dh: sub.p256dh, auth: sub.auth } }, vapid);
        const response = await fetch(sub.endpoint, { method: payload.method, headers: payload.headers, body: payload.body.buffer.slice(payload.body.byteOffset, payload.body.byteOffset + payload.body.byteLength) as ArrayBuffer });
        if (response.status === 404 || response.status === 410) await db.from("push_subscriptions").delete().eq("id", sub.id);
      } catch (error) { console.warn("block push failed", error); }
    }));
  } catch (error) { console.error("block push error", error); }
}

export const getMyReservedBlocks = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const db = await adminDb();
  const { data: reservations, error } = await db.from("delivery_block_reservations")
    .select("id,status,reserved_at,present_at,auto_assign_due_at,block_id,delivery_blocks(id,zone_name,starts_at,estimated_minutes,status,committed_pay,tips_total,assigned_driver_id)")
    .eq("driver_id", context.userId).in("status", ["reserved","present","assigned"]).order("reserved_at", { ascending:false });
  if (error) throw new Error(error.message);
  return reservations ?? [];
});

export const markDeliveryBlockPresent = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ reservationId:uuid }).parse(raw)).handler(async ({ context, data }) => {
    const db = await adminDb();
    const { data: dueAt, error } = await db.rpc("mark_delivery_block_present", { p_reservation:data.reservationId, p_driver:context.userId });
    if (error) throw new Error(error.message);
    return { dueAt: dueAt as string };
  });

export const runDeliveryBlockAutoAssignment = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ blockId:uuid.optional() }).parse(raw)).handler(async ({ context, data }) => {
    const db = await adminDb();
    const { data: reservations, error } = await db.from("delivery_block_reservations")
      .select("id,block_id,driver_id,auto_assign_due_at,delivery_blocks!inner(id,assigned_driver_id,status)")
      .eq("status","present").not("auto_assign_due_at","is",null).lte("auto_assign_due_at",new Date().toISOString());
    if (error) throw new Error(error.message);
    let assigned = 0;
    for (const reservation of reservations ?? []) {
      if (data.blockId && reservation.block_id !== data.blockId) continue;
      if (reservation.delivery_blocks?.assigned_driver_id) continue;
      const { error: assignError } = await db.rpc("assign_delivery_block", { p_block:reservation.block_id, p_driver:reservation.driver_id, p_actor:context.userId });
      if (!assignError) assigned++;
    }
    return { assigned };
  });

export const adminAssignDeliveryBlock = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ blockId:uuid,driverId:uuid }).parse(raw)).handler(async ({ context, data }) => {
    await requireAdmin(context);
    const db = await adminDb();
    const { error } = await db.rpc("assign_delivery_block", { p_block:data.blockId,p_driver:data.driverId,p_actor:context.userId });
    if (error) throw new Error(error.message);
    return { ok:true as const };
  });

export const getMyActiveDeliveryBlock = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const db = await adminDb();
  const { data: block, error } = await db.from("delivery_blocks")
    .select("id,zone_name,starts_at,estimated_minutes,status,committed_pay,tips_total,door_bonus_enabled,door_bonus_amount,started_at,completed_at")
    .eq("assigned_driver_id",context.userId).in("status",["assigned","active"]).order("assigned_at",{ascending:false}).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!block) return null;
  const { data: stops } = await db.from("delivery_block_stops")
    .select("id,store_order_id,sequence_number,size_label,heavy_items,has_cold_items,requires_safe_return,door_service,window_start,window_end,estimated_minutes,status,departed_at,eta,arrived_at,wait_started_at,delivered_at,delivery_photo_url,store_orders!inner(numero_pedido,direccion_envio,business_id,businesses(business_name,address,city))")
    .eq("block_id",block.id).order("sequence_number");
  return { block, stops:stops ?? [] };
});

export const startDeliveryBlock = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ blockId:uuid }).parse(raw)).handler(async ({ context, data }) => {
    const db = await adminDb();
    const now = new Date();
    const { data: block, error } = await db.from("delivery_blocks").update({ status:"active",started_at:now.toISOString() }).eq("id",data.blockId).eq("assigned_driver_id",context.userId).eq("status","assigned").select("id").maybeSingle();
    if (error || !block) throw new Error(error?.message ?? "El lote no está listo para comenzar");
    const { data: stops } = await db.from("delivery_block_stops").select("id,store_order_id,estimated_minutes,store_orders!inner(cliente_id)").eq("block_id",data.blockId).order("sequence_number");
    let cursor = now.getTime();
    for (const stop of stops ?? []) {
      const eta = new Date(cursor).toISOString();
      await db.from("delivery_block_stops").update({ departed_at:now.toISOString(),eta,status:"en_route",departure_message_sent_at:now.toISOString() }).eq("id",stop.id);
      await sendCustomerPush(stop.store_orders.cliente_id,"Tu pedido salió. Ya puedes ver la hora estimada de llegada.",stop.store_order_id);
      cursor += Number(stop.estimated_minutes || 15) * 60_000;
    }
    await db.from("delivery_block_events").insert({ block_id:data.blockId,actor_id:context.userId,event_type:"departed",details:{ started_at:now.toISOString() } });
    return { ok:true as const };
  });

export const updateDeliveryBlockStop = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ stopId:uuid,action:z.enum(["arrived","waiting","delivered","returned"]),photoPath:z.string().max(400).optional(),note:z.string().trim().max(500).optional() }).parse(raw))
  .handler(async ({ context, data }) => {
    const db = await adminDb();
    const { data: stop } = await db.from("delivery_block_stops").select("id,block_id,store_order_id,status,requires_safe_return,delivery_blocks!inner(assigned_driver_id,status)").eq("id",data.stopId).maybeSingle();
    if (!stop || stop.delivery_blocks.assigned_driver_id !== context.userId) throw new Error("Esta parada no está asignada a ti");
    const now = new Date().toISOString();
    if (data.action === "arrived") await db.from("delivery_block_stops").update({ status:"arrived",arrived_at:now }).eq("id",data.stopId);
    if (data.action === "waiting") await db.from("delivery_block_stops").update({ status:"waiting",wait_started_at:now }).eq("id",data.stopId);
    if (data.action === "returned") await db.from("delivery_block_stops").update({ status:"returned",returned_at:now,delivery_note:data.note ?? null }).eq("id",data.stopId);
    if (data.action === "delivered") {
      if (!data.photoPath || !data.photoPath.startsWith(`${context.userId}/`)) throw new Error("La foto de entrega es obligatoria");
      await db.from("delivery_block_stops").update({ status:"delivered",delivered_at:now,delivery_photo_url:data.photoPath,delivery_note:data.note ?? null }).eq("id",data.stopId);
      await db.from("store_orders").update({ estado:"entregado",estado_entrega:"entregado",entregado_en:now,foto_entrega_url:data.photoPath }).eq("id",stop.store_order_id);
    }
    await db.from("delivery_block_events").insert({ block_id:stop.block_id,stop_id:stop.id,actor_id:context.userId,event_type:data.action,details:{ note:data.note ?? null } });
    const { count } = await db.from("delivery_block_stops").select("id",{count:"exact",head:true}).eq("block_id",stop.block_id).not("status","in","(delivered,returned)");
    if ((count ?? 0) === 0) {
      const { data: block } = await db.from("delivery_blocks").select("started_at").eq("id",stop.block_id).single();
      const actualMinutes = block?.started_at ? Math.max(1,Math.round((Date.now()-new Date(block.started_at).getTime())/60000)) : null;
      await db.from("delivery_blocks").update({ status:"completed",completed_at:now,actual_minutes:actualMinutes }).eq("id",stop.block_id);
      const { registerAndTransferDeliveryBlock } = await import("./delivery-block-payouts.server");
      const result = await registerAndTransferDeliveryBlock(stop.block_id,db);
      return { ok:true as const,blockComplete:true,paymentSent:result.ok && !result.skipped,paymentError:result.error ?? null };
    }
    return { ok:true as const,blockComplete:false,paymentSent:false,paymentError:null };
  });

export const sendDeliveryBlockMessage = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ orderId:uuid,messageKey:z.enum(QUICK_MESSAGE_KEYS as unknown as [string,...string[]]).optional(),body:z.string().trim().min(1).max(1000) }).parse(raw))
  .handler(async ({ context, data }) => {
    const check = checkMessageForContacts(data.body);
    if (!check.ok) return { ok:false as const,blocked:true as const,message:CONTACT_BLOCK_MESSAGE };
    const db = await adminDb();
    const { data: stop } = await db.from("delivery_block_stops").select("id,block_id,store_order_id,delivery_blocks!inner(assigned_driver_id),store_orders!inner(cliente_id)").eq("store_order_id",data.orderId).maybeSingle();
    if (!stop) throw new Error("Pedido sin parada de lote");
    const isDriver = stop.delivery_blocks.assigned_driver_id === context.userId;
    const isCustomer = stop.store_orders.cliente_id === context.userId;
    if (!isDriver && !isCustomer) throw new Error("No puedes enviar mensajes en este pedido");
    await db.from("delivery_block_messages").insert({ block_id:stop.block_id,stop_id:stop.id,store_order_id:stop.store_order_id,sender_id:context.userId,sender_role:isDriver?"driver":"customer",message_key:data.messageKey ?? null,body:data.body });
    if (isDriver) await sendCustomerPush(stop.store_orders.cliente_id,data.messageKey?quickMessageText(data.messageKey as QuickMessageKey,"es"):data.body,data.orderId);
    return { ok:true as const,blocked:false as const,message:null };
  });

export const listDeliveryBlockMessages = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ orderId:uuid }).parse(raw)).handler(async ({ context, data }) => {
    const db = await adminDb();
    const { data: order } = await db.from("store_orders").select("cliente_id,repartidor_id").eq("id",data.orderId).maybeSingle();
    if (!order || (order.cliente_id!==context.userId && order.repartidor_id!==context.userId)) throw new Error("No puedes ver estos mensajes");
    const { data: messages,error } = await db.from("delivery_block_messages").select("id,sender_id,sender_role,body,message_key,read_at,created_at").eq("store_order_id",data.orderId).order("created_at");
    if (error) throw new Error(error.message);
    return messages ?? [];
  });

export const submitDeliveryBlockRating = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ orderId:uuid,stars:z.number().int().min(1).max(5),comment:z.string().trim().max(500).optional() }).parse(raw)).handler(async ({ context, data }) => {
    const db = await adminDb();
    const { data: stop } = await db.from("delivery_block_stops").select("id,block_id,status,delivery_blocks!inner(assigned_driver_id),store_orders!inner(cliente_id)").eq("store_order_id",data.orderId).maybeSingle();
    if (!stop || stop.store_orders.cliente_id!==context.userId || stop.status!=="delivered") throw new Error("Solo puedes calificar una entrega completada");
    const { error } = await db.from("delivery_block_ratings").insert({ block_id:stop.block_id,stop_id:stop.id,store_order_id:data.orderId,driver_id:stop.delivery_blocks.assigned_driver_id,customer_id:context.userId,stars:data.stars,comment:data.comment ?? null });
    if (error) throw new Error(error.code==="23505"?"Ya calificaste esta entrega":error.message);
    return { ok:true as const };
  });