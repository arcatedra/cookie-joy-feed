import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import process from "node:process";
import { TIER_RANK, type DonationTier } from "@/lib/donation-tier";

/**
 * Lovable Payments webhook receiver.
 *
 * The path `/api/public/payments/webhook` is required — it matches the
 * webhook URL registered when payments were enabled. The provider posts
 * normalized events such as `transaction.completed`.
 */
export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const requestUrl = new URL(request.url);
        const envParam = requestUrl.searchParams.get("env");
        const environment =
          envParam === "live" || envParam === "sandbox"
            ? envParam
            : requestUrl.hostname.toLowerCase().includes("preview") ||
                requestUrl.hostname.toLowerCase().includes("localhost")
              ? "sandbox"
              : "live";

        // --- Signature verification ---
        // Try several common header names; the secret is the shared HMAC key.
        const secret =
          environment === "live"
            ? process.env.PAYMENTS_LIVE_WEBHOOK_SECRET
            : process.env.PAYMENTS_SANDBOX_WEBHOOK_SECRET;
        if (!secret) {
          console.error("[payments-webhook] Missing webhook secret", { environment });
          return new Response("Server misconfigured", { status: 500 });
        }

        const signatureHeader =
          request.headers.get("x-lovable-signature") ??
          request.headers.get("x-webhook-signature") ??
          request.headers.get("x-payments-signature") ??
          request.headers.get("stripe-signature");

        const ok = signatureHeader ? verifyPaymentSignature(body, signatureHeader, secret) : false;

        if (!ok) {
          console.warn("[payments-webhook] Signature verification failed", {
            haveHeader: Boolean(signatureHeader),
          });
          return new Response("Signature verification failed", { status: 401 });
        }

        let payload: unknown;
        try {
          payload = JSON.parse(body);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const eventType =
          (payload as { type?: string; event?: string })?.type ??
          (payload as { event?: string })?.event ??
          "";

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // --- Subscription lifecycle events ---
        if (
          eventType === "customer.subscription.created" ||
          eventType === "customer.subscription.updated" ||
          eventType === "customer.subscription.deleted"
        ) {
          const sub = (payload as { data?: { object?: Record<string, unknown> } })
            ?.data?.object as Record<string, unknown> | undefined;
          if (!sub?.id) {
            return Response.json({ ok: true, ignored: "no subscription object" });
          }
          const metadata = (sub.metadata as Record<string, string> | undefined) ?? {};
          const userId = metadata.userId ?? metadata.user_id;
          if (!userId) {
            console.warn("[payments-webhook] subscription event without userId metadata", sub.id);
            return Response.json({ ok: true, ignored: "no userId" });
          }
          const items =
            ((sub.items as { data?: Array<Record<string, unknown>> } | undefined)?.data) ?? [];
          const firstItem = items[0] as
            | { price?: { id?: string; lookup_key?: string | null; product?: string }; current_period_start?: number; current_period_end?: number }
            | undefined;
          const price = firstItem?.price;
          const priceId =
            price?.lookup_key ||
            (metadata.plan_price_id as string | undefined) ||
            price?.id ||
            "";
          const productId = price?.product ?? null;
          const status =
            eventType === "customer.subscription.deleted"
              ? "canceled"
              : (sub.status as string) ?? "active";
          const periodStart =
            firstItem?.current_period_start ?? (sub.current_period_start as number | undefined);
          const periodEnd =
            firstItem?.current_period_end ?? (sub.current_period_end as number | undefined);

          const { error: upsertErr } = await supabaseAdmin
            .from("subscriptions")
            .upsert(
              {
                user_id: userId,
                stripe_subscription_id: sub.id as string,
                stripe_customer_id: sub.customer as string,
                price_id: priceId,
                product_id: productId,
                status,
                current_period_start: periodStart
                  ? new Date(periodStart * 1000).toISOString()
                  : null,
                current_period_end: periodEnd
                  ? new Date(periodEnd * 1000).toISOString()
                  : null,
                cancel_at_period_end: Boolean(sub.cancel_at_period_end),
                environment,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "stripe_subscription_id" },
            );
          if (upsertErr) {
            console.error("[payments-webhook] subscription upsert failed", upsertErr);
            return new Response("Upsert failed", { status: 500 });
          }
          return Response.json({ ok: true, subscription: sub.id });
        }

        // --- Donation flow (one-off payments) ---
        const donationId = findString(payload, "donation_id");
        if (!donationId) {
          return Response.json({ ok: true, ignored: true });
        }

        if (
          eventType === "transaction.completed" ||
          eventType === "checkout.session.completed" ||
          eventType === "payment_intent.succeeded"
        ) {
          const paymentIntentId =
            findString(payload, "payment_intent_id") ??
            findString(payload, "payment_intent") ??
            null;

          const { data: donation, error: fetchErr } = await supabaseAdmin
            .from("donations")
            .select("id, user_id, amount, tier, status")
            .eq("id", donationId)
            .maybeSingle();

          if (fetchErr || !donation) {
            console.error("[payments-webhook] Donation not found", { donationId, fetchErr });
            return new Response("Donation not found", { status: 404 });
          }

          if (donation.status === "completed") {
            return Response.json({ ok: true, alreadyProcessed: true });
          }

          const { error: updateErr } = await supabaseAdmin
            .from("donations")
            .update({
              status: "completed",
              stripe_payment_intent_id: paymentIntentId ?? undefined,
            })
            .eq("id", donation.id);

          if (updateErr) {
            console.error("[payments-webhook] Failed to update donation", updateErr);
            return new Response("Update failed", { status: 500 });
          }

          if (donation.user_id) {
            await upgradeProfileTier(
              supabaseAdmin,
              donation.user_id,
              donation.tier as DonationTier,
            );
          }

          return Response.json({ ok: true, processed: true });
        }

        if (
          eventType === "transaction.payment_failed" ||
          eventType === "payment_intent.payment_failed"
        ) {
          await supabaseAdmin
            .from("donations")
            .update({ status: "failed" })
            .eq("id", donationId);
          return Response.json({ ok: true, failed: true });
        }

        return Response.json({ ok: true, ignored: true, eventType });

      },

      GET: async () =>
        new Response("Payments webhook endpoint. POST only.", {
          status: 405,
          headers: { Allow: "POST" },
        }),
    },
  },
});

function verifyPaymentSignature(body: string, signatureHeader: string, secret: string): boolean {
  // Stripe-style header: t=<timestamp>,v1=<hex hmac of "timestamp.body">
  if (signatureHeader.includes("v1=") && signatureHeader.includes("t=")) {
    const parts = signatureHeader.split(",").map((part) => part.trim());
    const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
    const signatures = parts
      .filter((part) => part.startsWith("v1="))
      .map((part) => part.slice(3));

    if (!timestamp || signatures.length === 0) return false;
    const expected = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
    return signatures.some((sig) => safeCompare(sig, expected));
  }

  // Lovable/gateway-style headers may contain the raw HMAC or sha256=<hmac>.
  const expectedHex = createHmac("sha256", secret).update(body).digest("hex");
  const expectedBase64 = createHmac("sha256", secret).update(body).digest("base64");
  const provided = signatureHeader.replace(/^sha256=/i, "").trim();
  return safeCompare(provided, expectedHex) || safeCompare(provided, expectedBase64);
}

function safeCompare(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  try {
    return timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

/** Recursively search any payload shape for a string value at `key`. */
function findString(obj: unknown, key: string): string | null {
  if (obj === null || typeof obj !== "object") return null;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (k === key && typeof v === "string" && v.length > 0) return v;
    if (typeof v === "object" && v !== null) {
      const nested = findString(v, key);
      if (nested) return nested;
    }
  }
  return null;
}

async function upgradeProfileTier(
  admin: Awaited<ReturnType<typeof loadAdmin>>,
  userId: string,
  newTier: DonationTier,
) {
  const { data: profile } = await admin
    .from("profiles")
    .select("donation_tier")
    .eq("id", userId)
    .maybeSingle();

  const current = profile?.donation_tier as DonationTier | null | undefined;
  const currentRank = current ? TIER_RANK[current] : 0;
  if (TIER_RANK[newTier] > currentRank) {
    await admin.from("profiles").update({ donation_tier: newTier }).eq("id", userId);
  }
}

// Helper purely for typing the parameter above.
async function loadAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
