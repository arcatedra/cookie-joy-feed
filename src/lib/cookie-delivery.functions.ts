import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const transferDeliveredCookieTip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ stopId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: stop, error } = await context.supabase.from("route_stops")
      .select("order_id, status, delivery_routes!inner(driver_id)")
      .eq("id", data.stopId).eq("delivery_routes.driver_id", context.userId).maybeSingle();
    if (error || !stop || stop.status !== "entregado") throw new Error("La entrega no está confirmada para este repartidor.");
    const { flushCookieOrderTip } = await import("./driver-payouts.server");
    await flushCookieOrderTip(stop.order_id);
    return { ok: true };
  });