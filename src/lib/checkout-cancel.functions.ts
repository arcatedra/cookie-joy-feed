import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Only expire an open session: a completed authorization must never release credit here. */
export const cancelPendingCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ kind: z.enum(["store", "cookie"]), orderId: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const table = data.kind === "store" ? "store_orders" : "pedidos";
    const { data: order, error } = await context.supabase.from(table)
      .select("id,estado,stripe_environment,stripe_checkout_session_id")
      .eq("id", data.orderId).eq("cliente_id", context.userId).maybeSingle();
    if (error || !order) throw new Error("Pedido no encontrado.");
    const { paymentsEnvironmentForHost, stripeGet, stripePost } = await import("./stripe.server");
    const env = order.stripe_environment;
    if ((env !== "sandbox" && env !== "live") || env !== paymentsEnvironmentForHost(getRequestHost())) throw new Error("El pedido pertenece a otro ambiente.");
    if (order.estado !== "pendiente" && order.estado !== "pendiente_pago") return { cancelled: false };
    if (order.stripe_checkout_session_id) {
      const session = await stripeGet<{ status: string }>(`/v1/checkout/sessions/${order.stripe_checkout_session_id}`, env);
      if (session.status === "complete") return { cancelled: false };
      if (session.status === "open") await stripePost(`/v1/checkout/sessions/${order.stripe_checkout_session_id}/expire`, {}, env, { "Idempotency-Key": `expire-${data.kind}-${order.id}` });
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cancelled, error: saveError } = await supabaseAdmin.from(table).update({ estado: "cancelado" }).eq("id", order.id).in("estado", ["pendiente", "pendiente_pago"]).select("id");
    if (saveError) throw new Error("No se pudo cancelar el pago pendiente.");
    if (cancelled?.length) {
      const { releaseOrderCredit } = await import("./order-credit.server");
      await releaseOrderCredit(supabaseAdmin, data.kind, order.id);
    }
    return { cancelled: Boolean(cancelled?.length) };
  });