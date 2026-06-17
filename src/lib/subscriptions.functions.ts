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
interface StripeBillingPortalSession {
  id: string;
  url: string;
}

async function resolveOrCreateCustomer(
  stripePost: <T = unknown>(
    p: string,
    b: Record<string, unknown>,
    env?: "sandbox" | "live",
  ) => Promise<T>,
  stripeGet: <T = unknown>(p: string, env?: "sandbox" | "live") => Promise<T>,
  opts: { email?: string | null; userId: string },
  env: "sandbox" | "live",
): Promise<string> {
  // Search by metadata.userId first
  const search = await stripeGet<StripeCustomerSearch>(
    `/v1/customers/search?query=${encodeURIComponent(`metadata['userId']:'${opts.userId}'`)}&limit=1`,
    env,
  );
  if (search.data.length) {
    const existing = search.data[0];
    // Backfill email on the Stripe Customer so Checkout prefills it
    // and the buyer doesn't need to retype it.
    if (opts.email && existing.email !== opts.email) {
      await stripePost(`/v1/customers/${existing.id}`, { email: opts.email }, env);
    }
    return existing.id;
  }
  // Create new
  const created = await stripePost<{ id: string }>(
    "/v1/customers",
    {
      ...(opts.email ? { email: opts.email } : {}),
      metadata: { userId: opts.userId },
    },
    env,
  );
  return created.id;
}

const PURCHASE_STATUSES = new Set(["active", "trialing", "past_due"]);

async function syncLatestSubscriptionFromStripe(
  userId: string,
  env: "sandbox" | "live",
  opts: { knownSubscriptionId?: string; email?: string | null } = {},
) {
  const { stripeGet } = await import("./stripe.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let subscriptions: StripeSubscription[] = [];

  // Fast path: we already know the subscription id — fetch directly (no search-index delay).
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
    // Customer search by userId metadata; fall back to email if no match.
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
        Number(PURCHASE_STATUSES.has(b.status)) - Number(PURCHASE_STATUSES.has(a.status)) ||
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
      "id, price_id, status, current_period_end, cancel_at_period_end, stripe_subscription_id",
    )
    .maybeSingle();

  if (error) {
    console.error("[subscriptions] stripe sync upsert failed", error);
    return null;
  }

  return row ?? null;
}

export const createSubscriptionCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => checkoutSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId, claims } = context;
    const email = (claims.email as string | undefined) ?? null;
    const { stripePost, stripeGet, paymentsEnvironmentForHost } = await import("./stripe.server");

    const host = getRequestHost();
    const env = paymentsEnvironmentForHost(host);

    // Resolve human-readable price_id (lookup_key) to Stripe price id
    const prices = await stripeGet<StripePriceList>(
      `/v1/prices/search?query=${encodeURIComponent(`lookup_key:'${data.priceId}'`)}&limit=1`,
      env,
    );
    if (!prices.data.length) {
      console.error("[subscriptions] price lookup failed", data.priceId);
      throw new Error("Plan no disponible. Inténtalo más tarde.");
    }
    const stripePrice = prices.data[0];

    const customerId = await resolveOrCreateCustomer(stripePost, stripeGet, { email, userId }, env);

    const proto = host?.startsWith("localhost") ? "http" : "https";
    const origin = `${proto}://${host}`;

    const session = await stripePost<StripeCheckoutSession>(
      "/v1/checkout/sessions",
      {
        mode: "subscription",
        customer: customerId,
        success_url: `${origin}/subscribe?status=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/subscribe?status=cancel`,
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        automatic_tax: { enabled: true },
        customer_update: { address: "auto" },
        metadata: { userId, plan_price_id: data.priceId },
        subscription_data: { metadata: { userId, plan_price_id: data.priceId } },
      },
      env,
    );

    return { url: session.url };
  });

interface StripeInvoicePI {
  id: string;
  latest_invoice:
    | string
    | {
        id: string;
        confirmation_secret?: { client_secret: string; type?: string } | null;
        payment_intent?: { id: string; client_secret: string; status: string } | string | null;
      }
    | null;
  status: string;
  pending_setup_intent?: { id: string; client_secret: string } | string | null;
}

interface StripeInvoice {
  id: string;
  confirmation_secret?: { client_secret: string; type?: string } | null;
  payment_intent?: { id: string; client_secret: string; status: string } | string | null;
}

interface StripePaymentIntent {
  id: string;
  client_secret: string;
  status: string;
}

interface StripeSetupIntent {
  id: string;
  client_secret: string;
  status: string;
}

/**
 * Creates a subscription in `default_incomplete` state and returns the
 * PaymentIntent (or SetupIntent) client_secret so the frontend can confirm
 * payment with Stripe Elements.
 */
export const createSubscriptionIntent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => checkoutSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId, claims } = context;
    const email = (claims.email as string | undefined) ?? null;
    const { stripePost, stripeGet, paymentsEnvironmentForHost } = await import("./stripe.server");

    const host = getRequestHost();
    const env = paymentsEnvironmentForHost(host);

    const prices = await stripeGet<StripePriceList>(
      `/v1/prices/search?query=${encodeURIComponent(`lookup_key:'${data.priceId}'`)}&limit=1`,
      env,
    );
    if (!prices.data.length) {
      console.error("[subscriptions] price lookup failed", data.priceId);
      throw new Error("Plan no disponible. Inténtalo más tarde.");
    }
    const stripePrice = prices.data[0];

    const customerId = await resolveOrCreateCustomer(stripePost, stripeGet, { email, userId }, env);

    const sub = await stripePost<StripeInvoicePI>(
      "/v1/subscriptions",
      {
        customer: customerId,
        items: [{ price: stripePrice.id }],
        payment_behavior: "default_incomplete",
        payment_settings: {
          save_default_payment_method: "on_subscription",
          // Omit payment_method_types so Stripe uses every method
          // enabled in the Dashboard (cards, Apple Pay, Google Pay,
          // Link, wallets, etc.) — shown automatically by PaymentElement.
        },
        expand: [
          "latest_invoice.confirmation_secret",
          "latest_invoice.payment_intent",
          "pending_setup_intent",
        ],
        metadata: { userId, plan_price_id: data.priceId },
      },
      env,
    );

    let clientSecret: string | undefined;
    const inv = sub.latest_invoice;
    if (inv && typeof inv === "object") {
      clientSecret = inv.confirmation_secret?.client_secret;
      if (!clientSecret && inv.payment_intent && typeof inv.payment_intent === "object") {
        clientSecret = inv.payment_intent.client_secret;
      }
    }

    // Fallback 1: fetch the invoice directly with expansions.
    if (!clientSecret) {
      const invoiceId = typeof inv === "string" ? inv : inv?.id;
      if (invoiceId) {
        try {
          const fetched = await stripeGet<StripeInvoice>(
            `/v1/invoices/${encodeURIComponent(invoiceId)}?expand[]=confirmation_secret&expand[]=payment_intent`,
            env,
          );
          clientSecret = fetched.confirmation_secret?.client_secret;
          if (!clientSecret && fetched.payment_intent && typeof fetched.payment_intent === "object") {
            clientSecret = fetched.payment_intent.client_secret;
          }
          if (!clientSecret && typeof fetched.payment_intent === "string") {
            const pi = await stripeGet<StripePaymentIntent>(
              `/v1/payment_intents/${encodeURIComponent(fetched.payment_intent)}`,
              env,
            );
            clientSecret = pi.client_secret;
          }
        } catch (e) {
          console.warn("[subscriptions] invoice fallback failed", e);
        }
      }
    }

    // Fallback 2: free trials / 100% off → use the SetupIntent.
    if (!clientSecret && sub.pending_setup_intent) {
      const si = sub.pending_setup_intent;
      if (typeof si === "object") {
        clientSecret = si.client_secret;
      } else {
        try {
          const fetched = await stripeGet<StripeSetupIntent>(
            `/v1/setup_intents/${encodeURIComponent(si)}`,
            env,
          );
          clientSecret = fetched.client_secret;
        } catch (e) {
          console.warn("[subscriptions] setup_intent fallback failed", e);
        }
      }
    }

    if (!clientSecret) {
      console.error("[subscriptions] no client_secret on subscription", {
        subId: sub.id,
        status: sub.status,
        latestInvoiceType: typeof inv,
        hasPendingSetupIntent: Boolean(sub.pending_setup_intent),
        rawSub: JSON.stringify(sub).slice(0, 2000),
      });
      throw new Error("No se pudo iniciar el pago. Inténtalo de nuevo.");
    }

    // Persist the subscription row immediately (status=incomplete) so the app
    // can map this user → Stripe subscription even before the webhook fires.
    // The webhook will upsert by stripe_subscription_id and flip status to active.
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("subscriptions").upsert(
        {
          user_id: userId,
          stripe_subscription_id: sub.id,
          stripe_customer_id: customerId,
          product_id: stripePrice.product,
          price_id: data.priceId,
          status: sub.status ?? "incomplete",
          environment: env,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "stripe_subscription_id" },
      );
    } catch (e) {
      console.warn("[subscriptions] pre-webhook upsert failed (non-fatal)", e);
    }

    return {
      subscriptionId: sub.id,
      clientSecret,
      customerEmail: email,
      environment: env,
    };
  });

export const createBillingPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const host = getRequestHost();
    const { paymentsEnvironmentForHost } = await import("./stripe.server");
    const env = paymentsEnvironmentForHost(host);
    const { data: sub, error } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .eq("environment", env)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !sub?.stripe_customer_id) {
      if (error) console.error("[subscriptions] portal lookup failed", error);
      throw new Error("No tienes una suscripción activa.");
    }
    const proto = host?.startsWith("localhost") ? "http" : "https";
    const origin = `${proto}://${host}`;
    const { stripePost } = await import("./stripe.server");
    const portal = await stripePost<StripeBillingPortalSession>(
      "/v1/billing_portal/sessions",
      { customer: sub.stripe_customer_id, return_url: `${origin}/subscribe` },
      env,
    );
    return { url: portal.url };
  });

export const getMySubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const host = getRequestHost();
    const { paymentsEnvironmentForHost } = await import("./stripe.server");
    const env = paymentsEnvironmentForHost(host);
    const { data, error } = await context.supabase
      .from("subscriptions")
      .select(
        "id, price_id, status, current_period_end, cancel_at_period_end, stripe_subscription_id",
      )
      .eq("user_id", context.userId)
      .eq("environment", env)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error("[subscriptions] read failed", error);
      throw new Error("No se pudo cargar la suscripción.");
    }
    if (data && PURCHASE_STATUSES.has(data.status ?? "")) {
      return { subscription: data };
    }

    try {
      const email = (context.claims.email as string | undefined) ?? null;
      const synced = await syncLatestSubscriptionFromStripe(context.userId, env, {
        knownSubscriptionId: data?.stripe_subscription_id ?? undefined,
        email,
      });
      return { subscription: synced ?? data ?? null };
    } catch (syncError) {
      console.error("[subscriptions] stripe fallback sync failed", syncError);
      return { subscription: data ?? null };
    }
  });

export { PLAN_PRICE_IDS };
export type StripeSubscriptionEvent = StripeSubscription;
