import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequestHost } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PLAN_PRICE_IDS = [
  "plan_starter_monthly",
  "plan_essential_monthly",
  "plan_intermediate_monthly",
  "plan_premium_monthly",
] as const;

const checkoutSchema = z.object({
  priceId: z.enum(PLAN_PRICE_IDS),
});

interface StripePrice {
  id: string;
  product: string;
  lookup_key: string | null;
}
interface StripePriceList {
  data: StripePrice[];
}
interface StripeCustomerSearch {
  data: Array<{ id: string; email?: string | null }>;
}
interface StripeCheckoutSession {
  id: string;
  url: string;
}
interface StripeSubscription {
  id: string;
  customer: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_end?: number;
  items: { data: Array<{ price: { id: string; lookup_key: string | null; product: string } }> };
}
interface StripeBillingPortalSession {
  id: string;
  url: string;
}

async function resolveOrCreateCustomer(
  stripePost: <T = unknown>(p: string, b: Record<string, unknown>) => Promise<T>,
  stripeGet: <T = unknown>(p: string) => Promise<T>,
  opts: { email?: string | null; userId: string },
): Promise<string> {
  // Search by metadata.userId first
  const search = await stripeGet<StripeCustomerSearch>(
    `/v1/customers/search?query=${encodeURIComponent(`metadata['userId']:'${opts.userId}'`)}&limit=1`,
  );
  if (search.data.length) return search.data[0].id;
  // Create new
  const created = await stripePost<{ id: string }>("/v1/customers", {
    ...(opts.email ? { email: opts.email } : {}),
    metadata: { userId: opts.userId },
  });
  return created.id;
}

export const createSubscriptionCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => checkoutSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId, claims } = context;
    const email = (claims.email as string | undefined) ?? null;
    const { stripePost, stripeGet } = await import("./stripe.server");

    // Resolve human-readable price_id (lookup_key) to Stripe price id
    const prices = await stripeGet<StripePriceList>(
      `/v1/prices/search?query=${encodeURIComponent(`lookup_key:'${data.priceId}'`)}&limit=1`,
    );
    if (!prices.data.length) { console.error("[subscriptions] price lookup failed", data.priceId); throw new Error("Plan no disponible. Inténtalo más tarde."); }
    const stripePrice = prices.data[0];

    const customerId = await resolveOrCreateCustomer(stripePost, stripeGet, { email, userId });

    const host = getRequestHost();
    const proto = host?.startsWith("localhost") ? "http" : "https";
    const origin = `${proto}://${host}`;

    const session = await stripePost<StripeCheckoutSession>("/v1/checkout/sessions", {
      mode: "subscription",
      customer: customerId,
      success_url: `${origin}/subscribe?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/subscribe?status=cancel`,
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      automatic_tax: { enabled: true },
      customer_update: { address: "auto" },
      metadata: { userId, plan_price_id: data.priceId },
      subscription_data: { metadata: { userId, plan_price_id: data.priceId } },
    });

    return { url: session.url };
  });

export const createBillingPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: sub, error } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !sub?.stripe_customer_id) {
      if (error) console.error("[subscriptions] portal lookup failed", error);
      throw new Error("No tienes una suscripción activa.");
    }
    const host = getRequestHost();
    const proto = host?.startsWith("localhost") ? "http" : "https";
    const origin = `${proto}://${host}`;
    const { stripePost } = await import("./stripe.server");
    const portal = await stripePost<StripeBillingPortalSession>(
      "/v1/billing_portal/sessions",
      { customer: sub.stripe_customer_id, return_url: `${origin}/subscribe` },
    );
    return { url: portal.url };
  });

export const getMySubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("subscriptions")
      .select(
        "id, price_id, status, current_period_end, cancel_at_period_end, stripe_subscription_id",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { subscription: data ?? null };
  });

export { PLAN_PRICE_IDS };
export type StripeSubscriptionEvent = StripeSubscription;
