import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

export type PendingSubstitution = {
  itemId: string;
  name: string;
  qty: number;
  notifiedAt: string | null;
  mode: string;
};

/** Artículos del pedido marcados sin stock que esperan respuesta del cliente. */
export const getMyPendingSubstitutions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string }) => ({ orderId: uuid.parse(d.orderId) }))
  .handler(async ({ context, data }): Promise<PendingSubstitution[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase.rpc("get_my_pending_substitutions", {
      p_order_id: data.orderId,
    });
    if (error) {
      console.error("[substitutions] pending error", error);
      return [];
    }
    return ((rows ?? []) as Array<Record<string, unknown>>).map((r) => ({
      itemId: String(r["item_id"]),
      name: String(r["nombre_producto"] ?? ""),
      qty: Number(r["cantidad"] ?? 1),
      notifiedAt: (r["notified_at"] as string | null) ?? null,
      mode: String(r["substitution_mode"] ?? "best_match"),
    }));
  });

/** El cliente responde: aceptar la mejor opción similar o pedir devolución. */
export const respondSubstitution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { itemId: string; response: "accept" | "refund" }) => ({
    itemId: uuid.parse(d.itemId),
    response: z.enum(["accept", "refund"]).parse(d.response),
  }))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { error } = await supabase.rpc("respond_substitution", {
      p_item_id: data.itemId,
      p_response: data.response,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
