import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

export const getOrderTracking = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string }) => ({ orderId: uuid.parse(d.orderId) }))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: order, error } = await supabase
      .from("courier_orders")
      .select("id, status, pickup_address, pickup_lat, pickup_lng, driver_id, accepted_at, picked_up_at, completed_at")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Pedido no encontrado");

    const { data: stops } = await supabase
      .from("courier_order_stops")
      .select("id, delivery_address, delivery_lat, delivery_lng, recipient_name, status, sequence_number, delivered_at")
      .eq("order_id", data.orderId)
      .order("sequence_number", { ascending: true });

    let driver: {
      full_name: string | null;
      phone: string | null;
      profile_photo_url: string | null;
      rating: number | null;
      last_lat: number | null;
      last_lng: number | null;
      last_seen_at: string | null;
      is_online: boolean | null;
    } | null = null;
    if (order.driver_id) {
      const { data: d } = await supabase
        .from("drivers")
        .select("full_name, phone, profile_photo_url, rating, last_lat, last_lng, last_seen_at, is_online")
        .eq("id", order.driver_id)
        .maybeSingle();
      driver = d ?? null;
    }

    return { order, stops: stops ?? [], driver };
  });
