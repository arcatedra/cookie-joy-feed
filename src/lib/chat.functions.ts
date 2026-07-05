import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

export const listOrderMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string }) => ({ orderId: uuid.parse(d.orderId) }))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("order_messages")
      .select("id, sender_id, sender_role, body, is_quick_reply, read_at, created_at")
      .eq("order_id", data.orderId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const sendOrderMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string; body: string; isQuickReply?: boolean }) => ({
    orderId: uuid.parse(d.orderId),
    body: z.string().trim().min(1).max(1000).parse(d.body),
    isQuickReply: Boolean(d.isQuickReply),
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    // Determine role by checking if user is the driver of the order
    const { data: order, error: oErr } = await supabase
      .from("courier_orders")
      .select("driver_id")
      .eq("id", data.orderId)
      .maybeSingle();
    if (oErr) throw new Error(oErr.message);
    if (!order) throw new Error("Pedido no encontrado");
    const role: "driver" | "customer" = order.driver_id === userId ? "driver" : "customer";

    const { error } = await supabase.from("order_messages").insert({
      order_id: data.orderId,
      sender_id: userId,
      sender_role: role,
      body: data.body,
      is_quick_reply: data.isQuickReply,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markMessagesRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string }) => ({ orderId: uuid.parse(d.orderId) }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("order_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("order_id", data.orderId)
      .neq("sender_id", userId)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const submitDriverRating = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string; stars: number; comment?: string; tags?: string[] }) => ({
    orderId: uuid.parse(d.orderId),
    stars: z.number().int().min(1).max(5).parse(d.stars),
    comment: z.string().trim().max(500).optional().parse(d.comment),
    tags: z.array(z.string().max(40)).max(6).optional().parse(d.tags),
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: order, error: oErr } = await supabase
      .from("courier_orders")
      .select("id, driver_id, status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (oErr) throw new Error(oErr.message);
    if (!order) throw new Error("Pedido no encontrado");
    if (order.status !== "completado") throw new Error("Solo puedes calificar pedidos completados");
    if (!order.driver_id) throw new Error("Este pedido no tiene repartidor asignado");

    const { error } = await supabase.from("driver_ratings").insert({
      order_id: data.orderId,
      driver_id: order.driver_id,
      customer_id: userId,
      stars: data.stars,
      comment: data.comment ?? null,
      tags: data.tags ?? [],
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyDriverRatings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: ratings, error } = await supabase
      .from("driver_ratings")
      .select("id, stars, comment, tags, created_at, order_id")
      .eq("driver_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    const total = ratings?.length ?? 0;
    const avg = total ? (ratings!.reduce((s, r) => s + r.stars, 0) / total) : 0;
    const dist = [1, 2, 3, 4, 5].map((s) => ({
      stars: s,
      count: ratings?.filter((r) => r.stars === s).length ?? 0,
    }));
    return { ratings: ratings ?? [], avg: Number(avg.toFixed(2)), total, dist };
  });

export const listBatchedActiveOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("courier_orders")
      .select("id, status, pickup_address, batch_id, batch_position, estimated_earnings")
      .eq("driver_id", userId)
      .in("status", ["aceptado", "en_recoleccion", "en_camino_entrega"])
      .order("batch_position", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
