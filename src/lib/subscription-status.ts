export const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due"] as const;

export const EXTRA_DELIVERY_PRICE_CENTS = 1000;

export const PLAN_DELIVERIES_BY_PRICE_ID: Record<string, number> = {
  plan_starter_monthly: 2,
  plan_essential_monthly: 4,
  plan_intermediate_monthly: 6,
  plan_premium_monthly: 8,
};

export const PLAN_NAMES_BY_PRICE_ID: Record<string, string> = {
  plan_starter_monthly: "Starter Plan",
  plan_essential_monthly: "Essential Plan",
  plan_intermediate_monthly: "Intermediate Plan",
  plan_premium_monthly: "Premium Plan",
};

export interface SubscriptionSummary {
  id: string;
  price_id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_subscription_id: string | null;
}

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

export interface SubscriptionSnapshot {
  subscription: SubscriptionSummary | null;
  deliveryStatus: DeliveryStatus;
}

export function isSubscriptionActive(
  subscription: Pick<SubscriptionSummary, "status" | "current_period_end" | "cancel_at_period_end"> | null | undefined,
) {
  if (!subscription) return false;
  const status = subscription.status ?? "";
  const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end) : null;
  const hasFutureOrOpenPeriod = !periodEnd || periodEnd.getTime() > Date.now();

  if (ACTIVE_SUBSCRIPTION_STATUSES.includes(status as (typeof ACTIVE_SUBSCRIPTION_STATUSES)[number])) {
    return hasFutureOrOpenPeriod;
  }

  return status === "canceled" && subscription.cancel_at_period_end && hasFutureOrOpenPeriod;
}

export function emptyDeliveryStatus(): DeliveryStatus {
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
    supportsExtra: false,
    extraPriceCents: EXTRA_DELIVERY_PRICE_CENTS,
  };
}