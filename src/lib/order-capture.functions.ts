import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Cobro del monto real al terminar el empaque.
 *
 * Flujo: al hacer el pedido se AUTORIZA (reserva) el estimado + margen.
 * Aquí se CAPTURA (cobra) únicamente lo que realmente se empacó.
 * Nunca se cobra más de lo autorizado.
 */

const uuid = z.string().uuid();

export type PackingItem = {
  id: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  status: string;
};

export type PackingOrder = {
  id: string;
  numeroPedido: string;
  estado: string;
  moneda: string;
  subtotal: number;
  costoEnvio: number;
  impuestos: number;
  total: number;
  montoAutorizado: number | null;
  montoCapturado: number | null;
  autorizadoEn: string | null;
  capturadoEn: string | null;
  capturaError: string | null;
  items: PackingItem[];
};

async function assertAdmin(context: {
  supabase: import("@supabase/supabase-js").SupabaseClient;
  userId: string;
}) {
  const { data: isAdmin } = await context.supabase.rpc("has_role" as never, {
    _user_id: context.userId,
    _role: "admin",
  } as never);
  if (!isAdmin) throw new Error("Solo un administrador puede cobrar pedidos.");
}

/** Pedidos con dinero reservado, pendientes de cobro. */
export const listOrdersToCapture = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PackingOrder[]> => {
    const ctx = context as {
      supabase: import("@supabase/supabase-js").SupabaseClient;
      userId: string;
    };
    await assertAdmin(ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("pedidos")
      .select(
        `id,numero_pedido,estado,moneda,subtotal,costo_envio,impuestos,total,
         monto_autorizado,monto_capturado,autorizado_en,capturado_en,captura_error,
         pedido_items(id,nombre_producto,cantidad,precio_unitario,status)`,
      )
      .eq("flujo_pago", "autorizacion_diferida")
      .in("estado", ["autorizado", "autorizacion_fallida"])
      .order("creado_en", { ascending: true })
      .limit(100);
    if (error) throw new Error(error.message);

    type Row = Record<string, unknown> & {
      pedido_items?: Array<Record<string, unknown>>;
    };
    return ((data ?? []) as unknown as Row[]).map((p) => ({
      id: String(p.id),
      numeroPedido: String(p.numero_pedido),
      estado: String(p.estado),
      moneda: String(p.moneda ?? "USD"),
      subtotal: Number(p.subtotal ?? 0),
      costoEnvio: Number(p.costo_envio ?? 0),
      impuestos: Number(p.impuestos ?? 0),
      total: Number(p.total ?? 0),
      montoAutorizado: p.monto_autorizado == null ? null : Number(p.monto_autorizado),
      montoCapturado: p.monto_capturado == null ? null : Number(p.monto_capturado),
      autorizadoEn: (p.autorizado_en as string | null) ?? null,
      capturadoEn: (p.capturado_en as string | null) ?? null,
      capturaError: (p.captura_error as string | null) ?? null,
      items: (p.pedido_items ?? []).map((it) => ({
        id: String(it.id),
        nombre: String(it.nombre_producto),
        cantidad: Number(it.cantidad ?? 0),
        precioUnitario: Number(it.precio_unitario ?? 0),
        status: String(it.status ?? "pendiente"),
      })),
    }));
  });

const captureSchema = z.object({
  pedidoId: uuid,
  items: z
    .array(
      z.object({
        id: uuid,
        cantidad: z.number().int().min(0).max(999),
        precioUnitario: z.number().min(0).max(10000),
      }),
    )
    .max(200)
    .default([]),
});

export type CaptureResult =
  | {
      ok: true;
      capturado: number;
      autorizado: number;
      recortado: boolean;
      sobrante: number;
    }
  | { ok: false; error: string };

/**
 * Cobra el monto real de un pedido autorizado.
 * - Menor que lo reservado -> se cobra menos y el resto se libera solo.
 * - Mayor que lo reservado -> se cobra el tope y se avisa del faltante.
 */
export const captureOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => captureSchema.parse(d))
  .handler(async ({ data, context }): Promise<CaptureResult> => {
    const ctx = context as {
      supabase: import("@supabase/supabase-js").SupabaseClient;
      userId: string;
    };
    await assertAdmin(ctx);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { paymentsEnvironmentForHost, stripeCapturePaymentIntent } = await import(
      "./stripe.server"
    );

    const { data: pedido } = await supabaseAdmin
      .from("pedidos")
      .select(
        "id,numero_pedido,estado,flujo_pago,costo_envio,impuestos,monto_autorizado,captura_intentos,stripe_payment_intent_id",
      )
      .eq("id", data.pedidoId)
      .maybeSingle();

    if (!pedido) return { ok: false, error: "El pedido no existe." };
    const p = pedido as Record<string, unknown>;

    if (p.flujo_pago !== "autorizacion_diferida") {
      return { ok: false, error: "Este pedido se cobró al hacerlo; no hay nada que capturar." };
    }
    if (p.estado === "pagado") {
      return { ok: false, error: "Este pedido ya fue cobrado." };
    }
    if (p.estado !== "autorizado" && p.estado !== "autorizacion_fallida") {
      return { ok: false, error: "Este pedido no tiene dinero reservado." };
    }
    const intentId = (p.stripe_payment_intent_id as string | null) ?? null;
    if (!intentId) return { ok: false, error: "Falta la referencia del pago reservado." };

    const intentos = Number(p.captura_intentos ?? 0);
    if (intentos >= 3) {
      return { ok: false, error: "Se alcanzó el máximo de intentos de cobro. Revísalo a mano." };
    }

    // Guarda las cantidades/precios reales del empaque.
    for (const it of data.items) {
      await supabaseAdmin
        .from("pedido_items")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({
          cantidad: it.cantidad,
          precio_unitario: it.precioUnitario,
          subtotal_item: Math.round(it.cantidad * it.precioUnitario * 100) / 100,
          status: it.cantidad === 0 ? "sin_stock" : "encontrado",
        } as any)
        .eq("id", it.id)
        .eq("pedido_id", data.pedidoId);
    }

    // Monto real a partir de lo realmente empacado.
    const { data: items } = await supabaseAdmin
      .from("pedido_items")
      .select("cantidad,precio_unitario,status")
      .eq("pedido_id", data.pedidoId);

    const realSubtotalCents = (items ?? []).reduce((s, raw) => {
      const r = raw as Record<string, unknown>;
      if (r.status === "sin_stock") return s;
      return s + Math.round(Number(r.precio_unitario ?? 0) * 100) * Number(r.cantidad ?? 0);
    }, 0);

    const shippingCents = Math.round(Number(p.costo_envio ?? 0) * 100);
    const taxCents = Math.round(Number(p.impuestos ?? 0) * 100);
    const authorizedCents = Math.round(Number(p.monto_autorizado ?? 0) * 100);
    if (authorizedCents <= 0) return { ok: false, error: "No hay monto reservado válido." };

    const wantedCents = realSubtotalCents + shippingCents + taxCents;
    const captureCents = Math.min(Math.max(wantedCents, 50), authorizedCents);
    const recortado = wantedCents > authorizedCents;

    const host = getRequestHost();
    const env = paymentsEnvironmentForHost(host);

    try {
      await stripeCapturePaymentIntent(
        intentId,
        captureCents,
        // Misma clave para el mismo pedido y monto: nunca cobra dos veces.
        `capture-${data.pedidoId}-${captureCents}`,
        env,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      console.error("[order-capture] capture failed", msg);
      await supabaseAdmin
        .from("pedidos")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({
          estado: "autorizacion_fallida",
          captura_intentos: intentos + 1,
          captura_error: msg.slice(0, 500),
        } as any)
        .eq("id", data.pedidoId);
      return {
        ok: false,
        error: "No se pudo cobrar la tarjeta. El pedido queda en pago pendiente.",
      };
    }

    await supabaseAdmin
      .from("pedidos")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({
        estado: "pagado",
        total: captureCents / 100,
        subtotal: realSubtotalCents / 100,
        monto_capturado: captureCents / 100,
        capturado_en: new Date().toISOString(),
        captura_intentos: intentos + 1,
        captura_error: null,
      } as any)
      .eq("id", data.pedidoId);

    return {
      ok: true,
      capturado: captureCents / 100,
      autorizado: authorizedCents / 100,
      recortado,
      sobrante: Math.max(0, authorizedCents - captureCents) / 100,
    };
  });

/** Cancela la reserva completa (pedido cancelado antes de empacar). */
export const releaseOrderAuthorization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { pedidoId: string }) => ({ pedidoId: uuid.parse(d.pedidoId) }))
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    const ctx = context as {
      supabase: import("@supabase/supabase-js").SupabaseClient;
      userId: string;
    };
    await assertAdmin(ctx);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { paymentsEnvironmentForHost, stripeCancelPaymentIntent } = await import(
      "./stripe.server"
    );

    const { data: pedido } = await supabaseAdmin
      .from("pedidos")
      .select("id,estado,flujo_pago,stripe_payment_intent_id")
      .eq("id", data.pedidoId)
      .maybeSingle();
    if (!pedido) return { ok: false, error: "El pedido no existe." };
    const p = pedido as Record<string, unknown>;
    if (p.estado === "pagado") return { ok: false, error: "El pedido ya fue cobrado." };
    const intentId = (p.stripe_payment_intent_id as string | null) ?? null;
    if (!intentId) return { ok: false, error: "Falta la referencia del pago reservado." };

    try {
      await stripeCancelPaymentIntent(
        intentId,
        `release-${data.pedidoId}`,
        paymentsEnvironmentForHost(getRequestHost()),
      );
    } catch (e) {
      console.error("[order-capture] release failed", e);
      return { ok: false, error: "No se pudo liberar la reserva." };
    }

    await supabaseAdmin
      .from("pedidos")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ estado: "cancelado", monto_capturado: 0 } as any)
      .eq("id", data.pedidoId);
    return { ok: true };
  });
