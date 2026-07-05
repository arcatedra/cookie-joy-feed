import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

export const getActiveOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("courier_orders")
      .select("id, status")
      .eq("driver_id", userId)
      .in("status", ["aceptado", "en_recoleccion", "en_camino_entrega"])
      .order("accepted_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const listAvailableOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("courier_orders")
      .select("id, pickup_address, pickup_contact_name, estimated_earnings, estimated_duration_minutes, created_at, courier_order_stops(id)")
      .eq("status", "disponible")
      .is("driver_id", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((o) => ({
      id: o.id,
      pickup_address: o.pickup_address,
      pickup_contact_name: o.pickup_contact_name,
      estimated_earnings: Number(o.estimated_earnings),
      estimated_duration_minutes: o.estimated_duration_minutes,
      created_at: o.created_at,
      stops_count: (o.courier_order_stops as { id: string }[] | null)?.length ?? 0,
    }));
  });

export const getOrderDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string }) => ({ orderId: uuid.parse(d.orderId) }))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: order, error } = await supabase
      .from("courier_orders")
      .select("*")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Pedido no encontrado");

    const { data: stops, error: sErr } = await supabase
      .from("courier_order_stops")
      .select("*")
      .eq("order_id", data.orderId)
      .order("sequence_number", { ascending: true });
    if (sErr) throw new Error(sErr.message);

    return { order, stops: stops ?? [] };
  });

export const acceptOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string }) => ({ orderId: uuid.parse(d.orderId) }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    // Block if driver has an order in progress
    const { data: existing } = await supabase
      .from("courier_orders")
      .select("id")
      .eq("driver_id", userId)
      .in("status", ["aceptado", "en_recoleccion", "en_camino_entrega"])
      .limit(1)
      .maybeSingle();
    if (existing) throw new Error("Ya tienes un pedido en curso. Termínalo antes de aceptar otro.");

    const { data: updated, error } = await supabase
      .from("courier_orders")
      .update({ driver_id: userId, status: "aceptado", accepted_at: new Date().toISOString() })
      .eq("id", data.orderId)
      .eq("status", "disponible")
      .is("driver_id", null)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) throw new Error("Este pedido ya fue tomado por otro repartidor.");
    return { id: updated.id };
  });

export const startOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string }) => ({ orderId: uuid.parse(d.orderId) }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("courier_orders")
      .update({ status: "en_recoleccion" })
      .eq("id", data.orderId)
      .eq("driver_id", userId)
      .eq("status", "aceptado");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const confirmPickup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string }) => ({ orderId: uuid.parse(d.orderId) }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("courier_orders")
      .update({ status: "en_camino_entrega", picked_up_at: new Date().toISOString() })
      .eq("id", data.orderId)
      .eq("driver_id", userId)
      .eq("status", "en_recoleccion");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const confirmDeliverySchema = z.object({
  stopId: uuid,
  proofUrl: z.string().url().optional().nullable(),
  proofCode: z.string().max(50).optional().nullable(),
});

export const confirmDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => confirmDeliverySchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: stop, error: sErr } = await supabase
      .from("courier_order_stops")
      .select("id, order_id, courier_orders!inner(driver_id)")
      .eq("id", data.stopId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!stop) throw new Error("Parada no encontrada");
    // RLS also enforces; belt-and-suspenders
    // @ts-ignore nested type
    if (stop.courier_orders.driver_id !== userId) throw new Error("No autorizado");

    const { error } = await supabase
      .from("courier_order_stops")
      .update({
        status: "entregado",
        delivered_at: new Date().toISOString(),
        proof_url: data.proofUrl ?? null,
        proof_code: data.proofCode ?? null,
      })
      .eq("id", data.stopId);
    if (error) throw new Error(error.message);

    // Check if any pending stops remain
    const { data: pending } = await supabase
      .from("courier_order_stops")
      .select("id")
      .eq("order_id", stop.order_id)
      .in("status", ["pendiente", "en_camino"])
      .limit(1);

    if (!pending || pending.length === 0) {
      await supabase
        .from("courier_orders")
        .update({ status: "completado", completed_at: new Date().toISOString() })
        .eq("id", stop.order_id);
      return { ok: true, orderComplete: true };
    }
    return { ok: true, orderComplete: false };
  });

export const failStop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { stopId: string; reason: string }) => ({
    stopId: uuid.parse(d.stopId),
    reason: z.string().min(1).max(500).parse(d.reason),
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: stop } = await supabase
      .from("courier_order_stops")
      .select("id, order_id, courier_orders!inner(driver_id)")
      .eq("id", data.stopId)
      .maybeSingle();
    if (!stop) throw new Error("Parada no encontrada");
    // @ts-ignore nested
    if (stop.courier_orders.driver_id !== userId) throw new Error("No autorizado");

    const { error } = await supabase
      .from("courier_order_stops")
      .update({ status: "fallido", failure_reason: data.reason, delivered_at: new Date().toISOString() })
      .eq("id", data.stopId);
    if (error) throw new Error(error.message);

    const { data: pending } = await supabase
      .from("courier_order_stops")
      .select("id")
      .eq("order_id", stop.order_id)
      .in("status", ["pendiente", "en_camino"])
      .limit(1);
    if (!pending || pending.length === 0) {
      await supabase
        .from("courier_orders")
        .update({ status: "completado", completed_at: new Date().toISOString() })
        .eq("id", stop.order_id);
      return { ok: true, orderComplete: true };
    }
    return { ok: true, orderComplete: false };
  });

export const cancelOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string; reason: string }) => ({
    orderId: uuid.parse(d.orderId),
    reason: z.string().min(1).max(500).parse(d.reason),
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("courier_orders")
      .update({ status: "cancelado", cancellation_reason: data.reason, completed_at: new Date().toISOString() })
      .eq("id", data.orderId)
      .eq("driver_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setPreferredGpsApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { app: "google" | "waze" | "apple" }) => ({
    app: z.enum(["google", "waze", "apple"]).parse(d.app),
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("drivers").update({ preferred_gps_app: data.app }).eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const uploadDeliveryProof = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { stopId: string; fileName: string; contentBase64: string; contentType: string }) => ({
    stopId: uuid.parse(d.stopId),
    fileName: z.string().min(1).max(200).parse(d.fileName),
    contentBase64: z.string().min(1).parse(d.contentBase64),
    contentType: z.string().min(1).max(100).parse(d.contentType),
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    // Verify ownership
    const { data: stop } = await supabase
      .from("courier_order_stops")
      .select("id, courier_orders!inner(driver_id)")
      .eq("id", data.stopId)
      .maybeSingle();
    if (!stop) throw new Error("Parada no encontrada");
    // @ts-ignore nested
    if (stop.courier_orders.driver_id !== userId) throw new Error("No autorizado");

    const bytes = Uint8Array.from(atob(data.contentBase64), (c) => c.charCodeAt(0));
    const path = `${userId}/${data.stopId}/${Date.now()}-${data.fileName}`;
    const { error } = await supabase.storage.from("delivery-proofs").upload(path, bytes, {
      contentType: data.contentType,
      upsert: false,
    });
    if (error) throw new Error(error.message);
    const { data: signed } = await supabase.storage.from("delivery-proofs").createSignedUrl(path, 60 * 60 * 24 * 30);
    return { path, url: signed?.signedUrl ?? null };
  });
