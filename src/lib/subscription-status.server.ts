import {
  EXTRA_DELIVERY_PRICE_CENTS,
  PLAN_DELIVERIES_BY_PRICE_ID,
  PLAN_NAMES_BY_PRICE_ID,
  emptyDeliveryStatus,
  isSubscriptionActive,
  type DeliveryStatus,
  type SubscriptionSnapshot,
  type SubscriptionSummary,
} from "./subscription-status";
import { getRequestHost } from "@tanstack/react-start/server";

type StripeEnv = "sandbox" | "live";

interface StripeCustomerSearch {
  data: Array<{ id: string; email?: string | null }>;
}

interface StripeSubscription {
  id: string;
  customer: string;
  status: string;
  cancel_at_period_end: boolean;
  created?: number;
  current_period_start?: number;
  current_period_end?: number;
  metadata?: Record<string, string>;
  items: {
    data: Array<{ price: { id: string; lookup_key: string | null; product: string } }>;
  };
}

interface StripeSubscriptionList {
  data: StripeSubscription[];
}

interface InternalSubscriptionRow extends SubscriptionSummary {
  stripe_customer_id: string | null;
}

const ACTIVE_FOR_SORT = new Set(["active", "trialing", "past_due"]);

function toPublicSubscription(row: InternalSubscriptionRow | null): SubscriptionSummary | null {
  if (!row) return null;
  return {
    id: row.id,
    price_id: row.price_id,
    status: row.status,
    current_period_start: row.current_period_start,
    current_period_end: row.current_period_end,
    cancel_at_period_end: row.cancel_at_period_end,
    stripe_subscription_id: row.stripe_subscription_id,
  };
}

export async function syncLatestSubscriptionFromStripe(
  userId: string,
  env: StripeEnv,
  opts: { knownSubscriptionId?: string; email?: string | null } = {},
): Promise<InternalSubscriptionRow | null> {
  const { stripeGet } = await import("./stripe.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let subscriptions: StripeSubscription[] = [];

  if (opts.knownSubscriptionId) {
    try {
      const one = await stripeGet<StripeSubscription>(
        `/v1/subscriptions/${encodeURIComponent(opts.knownSubscriptionId)}`,
        env,
      );
      subscriptions = [one];
    } catch (e) {
      console.warn("[subscriptions] direct retrieve failed", e);
    }
  }

  if (!subscriptions.length) {
    const foundByMetadata = await stripeGet<StripeSubscriptionList>(
      `/v1/subscriptions/search?query=${encodeURIComponent(`metadata['userId']:'${userId}'`)}&limit=10`,
      env,
    );
    subscriptions = foundByMetadata.data;
  }

  if (!subscriptions.length) {
    const customers = await stripeGet<StripeCustomerSearch>(
      `/v1/customers/search?query=${encodeURIComponent(`metadata['userId']:'${userId}'`)}&limit=1`,
      env,
    );
    let customerId = customers.data[0]?.id;
    if (!customerId && opts.email) {
      const byEmail = await stripeGet<StripeCustomerSearch>(
        `/v1/customers/search?query=${encodeURIComponent(`email:'${opts.email}'`)}&limit=1`,
        env,
      );
      customerId = byEmail.data[0]?.id;
    }
    if (customerId) {
      const listed = await stripeGet<StripeSubscriptionList>(
        `/v1/subscriptions?customer=${encodeURIComponent(customerId)}&status=all&limit=10`,
        env,
      );
      subscriptions = listed.data;
    }
  }

  const latest = subscriptions
    .slice()
    .sort(
      (a, b) =>
        Number(ACTIVE_FOR_SORT.has(b.status)) - Number(ACTIVE_FOR_SORT.has(a.status)) ||
        (b.created ?? 0) - (a.created ?? 0),
    )[0];

  if (!latest) return null;

  const item = latest.items?.data?.[0];
  const price = item?.price;
  const priceId = price?.lookup_key || latest.metadata?.plan_price_id || price?.id || "unknown";

  const { data: row, error } = await supabaseAdmin
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        stripe_subscription_id: latest.id,
        stripe_customer_id: latest.customer,
        product_id: price?.product ?? null,
        price_id: priceId,
        status: latest.status,
        current_period_start: latest.current_period_start
          ? new Date(latest.current_period_start * 1000).toISOString()
          : null,
        current_period_end: latest.current_period_end
          ? new Date(latest.current_period_end * 1000).toISOString()
          : null,
        cancel_at_period_end: Boolean(latest.cancel_at_period_end),
        environment: env,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_subscription_id" },
    )
    .select(
      "id, price_id, status, current_period_start, current_period_end, cancel_at_period_end, stripe_subscription_id, stripe_customer_id",
    )
    .maybeSingle();

  if (error) {
    console.error("[subscriptions] stripe sync upsert failed", error);
    return null;
  }

  return (row as InternalSubscriptionRow | null) ?? null;
}

export async function loadSubscriptionSnapshot(opts: {
  supabase: any;
  userId: string;
  email: string | null;
  env: StripeEnv;
}): Promise<SubscriptionSnapshot> {
  const { supabase, userId, email, env } = opts;

  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "id, price_id, status, current_period_start, current_period_end, cancel_at_period_end, stripe_subscription_id, stripe_customer_id",
    )
    .eq("user_id", userId)
    .eq("environment", env)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[subscriptions] read failed", error);
    throw new Error("No se pudo cargar la suscripción.");
  }

  let row = (data as InternalSubscriptionRow | null) ?? null;

  if (!isSubscriptionActive(row)) {
    try {
      const synced = await syncLatestSubscriptionFromStripe(userId, env, {
        knownSubscriptionId: row?.stripe_subscription_id ?? undefined,
        email,
      });
      row = synced ?? row;
    } catch (syncError) {
      console.error("[subscriptions] stripe fallback sync failed", syncError);
    }
  }

  const subscription = toPublicSubscription(row);
  if (!isSubscriptionActive(subscription)) {
    return { subscription, deliveryStatus: emptyDeliveryStatus() };
  }

  const now = new Date();
  const periodStart = row?.current_period_start
    ? new Date(row.current_period_start)
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodEnd = row?.current_period_end
    ? new Date(row.current_period_end)
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const priceId = row?.price_id ?? null;
  let planName = priceId ? PLAN_NAMES_BY_PRICE_ID[priceId] ?? "Plan" : "Plan";
  let deliveriesPerMonth = priceId ? PLAN_DELIVERIES_BY_PRICE_ID[priceId] ?? 0 : 0;

  if (priceId) {
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("name, deliveries_per_month")
      .eq("price_id", priceId)
      .maybeSingle();

    if (!planError && plan) {
      planName = `${plan.name} Plan`;
      deliveriesPerMonth = plan.deliveries_per_month ?? deliveriesPerMonth;
    } else if (planError) {
      console.warn("[subscriptions] plan lookup failed", planError);
    }
  }

  const { count, error: countError } = await supabase
    .from("delivery_bookings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "scheduled")
    .gte("period_start", periodStart.toISOString())
    .lte("period_end", periodEnd.toISOString());

  if (countError) {
    console.warn("[subscriptions] delivery usage count failed", countError);
  }

  const used = count ?? 0;
  const deliveryStatus: DeliveryStatus = {
    hasActiveSubscription: true,
    planName,
    priceId,
    deliveriesPerMonth,
    used,
    remaining: Math.max(0, deliveriesPerMonth - used),
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    subscriptionId: row?.id ?? null,
    supportsExtra: priceId === "plan_starter_monthly",
    extraPriceCents: EXTRA_DELIVERY_PRICE_CENTS,
  };

  return { subscription, deliveryStatus };
}

export async function loadActiveDeliveryContext(
  supabase: any,
  userId: string,
  email: string | null,
) {
  const { paymentsEnvironmentForHost } = await import("./stripe.server");
  const env = paymentsEnvironmentForHost(getRequestHost());
  const snapshot = await loadSubscriptionSnapshot({ supabase, userId, email, env });
  const status = snapshot.deliveryStatus;
  if (!status.hasActiveSubscription || !status.subscriptionId || !status.priceId || !status.periodStart || !status.periodEnd) {
    return null;
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, price_id, stripe_customer_id")
    .eq("id", status.subscriptionId)
    .eq("user_id", userId)
    .maybeSingle();

  return {
    sub: {
      id: status.subscriptionId,
      price_id: status.priceId,
      stripe_customer_id: sub?.stripe_customer_id ?? null,
    },
    env,
    planName: status.planName,
    deliveriesPerMonth: status.deliveriesPerMonth,
    supportsExtra: status.supportsExtra,
    periodStart: new Date(status.periodStart),
    periodEnd: new Date(status.periodEnd),
  };
}