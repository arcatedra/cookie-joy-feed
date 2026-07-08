import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequestHost } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { syncLatestSubscriptionFromStripe } from "./subscriptions.functions";

const ACTIVE_STATUSES = ["active", "trialing", "past_due"] as const;
const ACTIVE_SET = new Set<string>(ACTIVE_STATUSES);
const EXTRA_DELIVERY_PRICE_CENTS = 1000;

export interface DeliveryStatus {
  hasActiveSubscription: boolean;
  planName: string | null;
  priceId: string | null;
  deliveriesPerMonth: number;
  used: number;
  remaining: number;
  periodStart: string | null;
  periodEnd: string | null;
  subscriptionId: string | null;
  supportsExtra: boolean;
  extraPriceCents: number;
}

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

async function loadActiveContext(
  supabase: any,
  userId: string,
  email: string | null,
) {
  const { paymentsEnvironmentForHost } = await import("./stripe.server");
  const env = paymentsEnvironmentForHost(getRequestHost());

  // Same read pattern as getMySubscription: env-scoped, latest row.
  const { data: latest } = await supabase
    .from("subscriptions")
    .select("id, price_id, status, current_period_start, current_period_end, stripe_subscription_id, stripe_customer_id")
    .eq("user_id", userId)
    .eq("environment", env)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let sub = latest && ACTIVE_SET.has(latest.status ?? "") ? latest : null;

  // Fallback: reconcile with Stripe (mirrors getMySubscription behaviour).
  if (!sub) {
    try {
      const synced = await syncLatestSubscriptionFromStripe(userId, env, {
        knownSubscriptionId: latest?.stripe_subscription_id ?? undefined,
        email,
      });
      if (synced && ACTIVE_SET.has(synced.status ?? "")) {
        const { data: refreshed } = await supabase
          .from("subscriptions")
          .select("id, price_id, status, current_period_start, current_period_end, stripe_subscription_id, stripe_customer_id")
          .eq("stripe_subscription_id", synced.stripe_subscription_id)
          .maybeSingle();
        sub = refreshed ?? null;
      }
    } catch (e) {
      console.error("[deliveries] stripe fallback failed", e);
    }
  }

  if (!sub) return null;

  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("name, deliveries_per_month, price_id")
    .eq("price_id", sub.price_id)
    .maybeSingle();

  const now = new Date();
  const start = sub.current_period_start
    ? new Date(sub.current_period_start)
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = sub.current_period_end
    ? new Date(sub.current_period_end)
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  return {
    sub,
    env,
    planName: plan?.name ?? "Plan",
    deliveriesPerMonth: plan?.deliveries_per_month ?? 0,
    supportsExtra: sub.price_id === "plan_starter_monthly",
    periodStart: start,
    periodEnd: end,
  };

}

export const getMyDeliveryStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DeliveryStatus> => {
    const ctx = await loadActiveContext(context.supabase, context.userId);
    if (!ctx) {
      return {
        hasActiveSubscription: false,
        planName: null,
        priceId: null,
        deliveriesPerMonth: 0,
        used: 0,
        remaining: 0,
        periodStart: null,
        periodEnd: null,
        subscriptionId: null,
      };
    }

    const { count } = await context.supabase
      .from("delivery_bookings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .eq("status", "scheduled")
      .gte("period_start", ctx.periodStart.toISOString())
      .lte("period_end", ctx.periodEnd.toISOString());

    const used = count ?? 0;
    return {
      hasActiveSubscription: true,
      planName: ctx.planName,
      priceId: ctx.sub.price_id,
      deliveriesPerMonth: ctx.deliveriesPerMonth,
      used,
      remaining: Math.max(0, ctx.deliveriesPerMonth - used),
      periodStart: ctx.periodStart.toISOString(),
      periodEnd: ctx.periodEnd.toISOString(),
      subscriptionId: ctx.sub.id,
    };
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
    const ctx = await loadActiveContext(context.supabase, context.userId);
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
    const ctx = await loadActiveContext(context.supabase, context.userId);
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
