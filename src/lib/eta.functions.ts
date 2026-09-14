import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

export type StopEta = {
  eta: string | null;
  sequenceNumber: number;
  totalStops: number;
  status: string;
} | null;

/**
 * Hora estimada de llegada del pedido del cliente autenticado.
 * Usa la función segura get_my_stop_eta: solo devuelve datos del propio pedido.
 */
export const getMyStopEta = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string }) => ({ orderId: uuid.parse(d.orderId) }))
  .handler(async ({ context, data }): Promise<StopEta> => {
    const { data: rows, error } = await context.supabase.rpc("get_my_stop_eta" as never, {
      p_order_id: data.orderId,
    } as never);
    if (error) return null;

    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row) return null;

    const r = row as {
      eta: string | null;
      sequence_number: number;
      total_stops: number;
      status: string;
    };

    return {
      eta: r.eta,
      sequenceNumber: r.sequence_number,
      totalStops: r.total_stops,
      status: r.status,
    };
  });
