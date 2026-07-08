import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequestHost } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadActiveDeliveryContext, loadSubscriptionSnapshot } from "./subscription-status.server";
import { EXTRA_DELIVERY_PRICE_CENTS, type DeliveryStatus } from "./subscription-status";

export interface DeliveryBookingRow {
  id: string;
  scheduled_date: string;
  status: string;
  address: string | null;
  notes: string | null;
  created_at: string;
  is_extra?: boolean;
}

function isMondayOrFriday(d: Date) {
  const day = d.getUTCDay();
  return day === 1 || day === 5;
}

export const getMyDeliveryStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DeliveryStatus> => {
    const email = (context.claims.email as string | undefined) ?? null;
    const { paymentsEnvironmentForHost } = await import("./stripe.server");
    const env = paymentsEnvironmentForHost(getRequestHost());
    const snapshot = await loadSubscriptionSnapshot({
      supabase: context.supabase,
      userId: context.userId,
      email,
      env,
    });
    return snapshot.deliveryStatus;
  });


export const listMyDeliveries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DeliveryBookingRow[]> => {
    const { data, error } = await context.supabase
      .from("delivery_bookings")
      .select("id, scheduled_date, status, address, notes, created_at")
      .eq("user_id", context.userId)
      .order("scheduled_date", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as DeliveryBookingRow[];
  });

const scheduleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  address: z.string().min(1).max(500).optional(),
  notes: z.string().max(1000).optional(),
});

export const scheduleDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => scheduleSchema.parse(data))
  .handler(async ({ data, context }) => {
    const ctx = await loadActiveDeliveryContext(context.supabase, context.userId, (context.claims.email as string | undefined) ?? null);
    if (!ctx) throw new Error("Necesitas una suscripción activa para programar entregas.");

    const date = new Date(`${data.date}T12:00:00Z`);
    if (Number.isNaN(date.getTime())) throw new Error("Fecha inválida.");
    if (!isMondayOrFriday(date)) {
      throw new Error("Solo puedes programar entregas en lunes o viernes.");
    }
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (date < today) throw new Error("No puedes programar una entrega en el pasado.");
    if (date < ctx.periodStart || date > ctx.periodEnd) {
      throw new Error("La fecha está fuera de tu período de suscripción actual.");
    }

    const { count } = await context.supabase
      .from("delivery_bookings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .eq("status", "scheduled")
      .gte("period_start", ctx.periodStart.toISOString())
      .lte("period_end", ctx.periodEnd.toISOString());

    if ((count ?? 0) >= ctx.deliveriesPerMonth) {
      const maxDate = ctx.periodEnd.toLocaleDateString("es-ES", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      throw new Error(
        `Has alcanzado el límite de ${ctx.deliveriesPerMonth} entregas para este período. ` +
        `Puedes programar hasta el ${maxDate}.`,
      );
    }

    // Prevent duplicate same-day scheduling
    const { data: dup } = await context.supabase
      .from("delivery_bookings")
      .select("id")
      .eq("user_id", context.userId)
      .eq("scheduled_date", data.date)
      .eq("status", "scheduled")
      .maybeSingle();
    if (dup) throw new Error("Ya tienes una entrega programada para ese día.");

    const { data: row, error } = await context.supabase
      .from("delivery_bookings")
      .insert({
        user_id: context.userId,
        subscription_id: ctx.sub.id,
        price_id: ctx.sub.price_id,
        scheduled_date: data.date,
        period_start: ctx.periodStart.toISOString(),
        period_end: ctx.periodEnd.toISOString(),
        address: data.address ?? null,
        notes: data.notes ?? null,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const cancelDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("delivery_bookings")
      .update({ status: "canceled" })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .eq("status", "scheduled");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const rescheduleSchema = z.object({
  id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
});

export const rescheduleDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => rescheduleSchema.parse(data))
  .handler(async ({ data, context }) => {
    const ctx = await loadActiveDeliveryContext(context.supabase, context.userId, (context.claims.email as string | undefined) ?? null);
    if (!ctx) throw new Error("Necesitas una suscripción activa.");

    const date = new Date(`${data.date}T12:00:00Z`);
    if (Number.isNaN(date.getTime())) throw new Error("Fecha inválida.");
    if (!isMondayOrFriday(date)) {
      throw new Error("Solo puedes programar entregas en lunes o viernes.");
    }
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (date < today) throw new Error("No puedes mover una entrega al pasado.");
    if (date < ctx.periodStart || date > ctx.periodEnd) {
      throw new Error("La fecha está fuera de tu período de suscripción actual.");
    }

    const { data: existing, error: exErr } = await context.supabase
      .from("delivery_bookings")
      .select("id, scheduled_date, status")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (exErr) throw new Error(exErr.message);
    if (!existing || existing.status !== "scheduled") {
      throw new Error("La entrega no está activa o no existe.");
    }
    if (existing.scheduled_date === data.date) {
      return { ok: true, unchanged: true };
    }

    const { count } = await context.supabase
      .from("delivery_bookings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .eq("status", "scheduled")
      .gte("period_start", ctx.periodStart.toISOString())
      .lte("period_end", ctx.periodEnd.toISOString());
    if ((count ?? 0) > ctx.deliveriesPerMonth) {
      const maxDate = ctx.periodEnd.toLocaleDateString("es-ES", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      throw new Error(
        `Has alcanzado el límite de ${ctx.deliveriesPerMonth} entregas para este período. ` +
        `Puedes programar hasta el ${maxDate}.`,
      );
    }

    const { data: dup } = await context.supabase
      .from("delivery_bookings")
      .select("id")
      .eq("user_id", context.userId)
      .eq("scheduled_date", data.date)
      .eq("status", "scheduled")
      .neq("id", data.id)
      .maybeSingle();
    if (dup) throw new Error("Ya tienes otra entrega ese día.");

    const { error } = await context.supabase
      .from("delivery_bookings")
      .update({ scheduled_date: data.date })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .eq("status", "scheduled");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const extraSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  address: z.string().min(1).max(500).optional(),
  notes: z.string().max(1000).optional(),
});

/**
 * Books an additional delivery beyond the plan's monthly limit for
 * Starter Plan users. Charges $10 via a Stripe invoice item that will be
 * added to the customer's next invoice.
 */
export const scheduleExtraDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => extraSchema.parse(data))
  .handler(async ({ data, context }) => {
    const email = (context.claims.email as string | undefined) ?? null;
    const ctx = await loadActiveDeliveryContext(context.supabase, context.userId, email);
    if (!ctx) throw new Error("Necesitas una suscripción activa.");
    if (!ctx.supportsExtra) {
      throw new Error("Tu plan no admite entregas adicionales. Actualiza al plan superior.");
    }

    const date = new Date(`${data.date}T12:00:00Z`);
    if (Number.isNaN(date.getTime())) throw new Error("Fecha inválida.");
    if (!isMondayOrFriday(date)) {
      throw new Error("Solo puedes programar entregas en lunes o viernes.");
    }
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (date < today) throw new Error("No puedes programar una entrega en el pasado.");
    if (date < ctx.periodStart || date > ctx.periodEnd) {
      throw new Error("La fecha está fuera de tu período de suscripción actual.");
    }

    const { data: dup } = await context.supabase
      .from("delivery_bookings")
      .select("id")
      .eq("user_id", context.userId)
      .eq("scheduled_date", data.date)
      .eq("status", "scheduled")
      .maybeSingle();
    if (dup) throw new Error("Ya tienes una entrega programada para ese día.");

    // Charge $10 via Stripe invoice item on the customer's next invoice.
    const customerId = (ctx.sub as { stripe_customer_id?: string | null }).stripe_customer_id;
    if (!customerId) {
      throw new Error("No pudimos localizar tu método de pago. Contáctanos.");
    }
    try {
      const { stripePost } = await import("./stripe.server");
      await stripePost(
        "/v1/invoiceitems",
        {
          customer: customerId,
          amount: EXTRA_DELIVERY_PRICE_CENTS,
          currency: "usd",
          description: `Extra delivery on ${data.date}`,
          metadata: { userId: context.userId, scheduled_date: data.date, kind: "extra_delivery" },
        },
        ctx.env,
      );
    } catch (e) {
      console.error("[deliveries] stripe invoice item failed", e);
      throw new Error("No pudimos registrar el cobro adicional. Inténtalo de nuevo.");
    }

    const { data: row, error } = await context.supabase
      .from("delivery_bookings")
      .insert({
        user_id: context.userId,
        subscription_id: ctx.sub.id,
        price_id: ctx.sub.price_id,
        scheduled_date: data.date,
        period_start: ctx.periodStart.toISOString(),
        period_end: ctx.periodEnd.toISOString(),
        address: data.address ?? null,
        notes: data.notes ?? null,
        is_extra: true,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { id: row.id, chargedCents: EXTRA_DELIVERY_PRICE_CENTS };
  });

