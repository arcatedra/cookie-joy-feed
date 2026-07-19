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

        // --- Subscription lifecycle events (mirrored to public.suscripciones) ---
        if (
          eventType === "customer.subscription.created" ||
          eventType === "customer.subscription.updated" ||
          eventType === "customer.subscription.deleted"
        ) {
          const sub = (payload as { data?: { object?: Record<string, unknown> } })?.data?.object as
            | Record<string, unknown>
            | undefined;
          if (!sub?.id) {
            return Response.json({ ok: true, ignored: "no subscription object" });
          }
          const metadata = (sub.metadata as Record<string, string> | undefined) ?? {};
          const clienteId =
            metadata.cliente_id ?? metadata.userId ?? metadata.user_id ?? null;
          if (!clienteId) {
            console.warn("[payments-webhook] subscription without cliente_id metadata", sub.id);
            return Response.json({ ok: true, ignored: "no cliente_id" });
          }
          const items =
            (sub.items as { data?: Array<Record<string, unknown>> } | undefined)?.data ?? [];
          const firstItem = items[0] as
            | {
                price?: {
                  id?: string;
                  lookup_key?: string | null;
                  nickname?: string | null;
                  unit_amount?: number | null;
                  currency?: string | null;
                };
                current_period_start?: number;
                current_period_end?: number;
              }
            | undefined;
          const price = firstItem?.price;
          const planLabel =
            price?.lookup_key || price?.nickname || (metadata.plan as string | undefined) || "mensual";
          const priceAmount =
            typeof price?.unit_amount === "number" ? price.unit_amount / 100 : 0;
          const stripeStatus = (sub.status as string) ?? "active";
          const estado =
            eventType === "customer.subscription.deleted" || stripeStatus === "canceled"
              ? "cancelada"
              : stripeStatus === "paused"
                ? "pausada"
                : stripeStatus === "past_due" || stripeStatus === "unpaid"
                  ? "vencida"
                  : stripeStatus === "trialing" || stripeStatus === "active"
                    ? "activa"
                    : stripeStatus;
          const periodStart =
            firstItem?.current_period_start ?? (sub.start_date as number | undefined) ??
            (sub.current_period_start as number | undefined);
          const periodEnd =
            firstItem?.current_period_end ?? (sub.current_period_end as number | undefined);
          const canceledAt =
            estado === "cancelada"
              ? (sub.canceled_at as number | undefined) ?? Math.floor(Date.now() / 1000)
              : null;

          const { error: rpcErr } = await supabaseAdmin.rpc("upsert_suscripcion_stripe", {
            p_cliente_id: clienteId,
            p_stripe_sub_id: sub.id as string,
            p_plan: planLabel,
            p_precio: priceAmount,
            p_moneda: (price?.currency ?? "USD").toString().toUpperCase(),
            p_estado: estado,
            p_fecha_inicio: periodStart ? new Date(periodStart * 1000).toISOString() : new Date().toISOString(),
            p_fecha_renovacion: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
            p_fecha_cancelacion: canceledAt ? new Date(canceledAt * 1000).toISOString() : null,
          });
          if (rpcErr) {
            console.error("[payments-webhook] suscripciones upsert failed", rpcErr);
            return new Response("Upsert failed", { status: 500 });
          }
          return Response.json({ ok: true, subscription: sub.id });
        }


        // --- Stars purchase (HAZOREX prize-pool flow) ---
        const dataObject =
          ((payload as { data?: { object?: Record<string, unknown> } })?.data?.object as
            | Record<string, unknown>
            | undefined) ?? undefined;
        const objectId = (dataObject?.id as string | undefined) ?? "";
        const metaKind =
          (dataObject?.metadata as Record<string, string> | undefined)?.kind ??
          findString(payload, "kind");

        // --- Cookie order (cart checkout) -> mark pedido as pagado ---
        if (
          metaKind === "cookie_order" &&
          eventType === "checkout.session.completed" &&
          objectId.startsWith("cs_")
        ) {
          const sessionId = objectId;
          const paymentIntentId =
            (dataObject?.payment_intent as string | undefined) ?? null;
          const meta = (dataObject?.metadata as Record<string, string> | undefined) ?? {};
          const pedidoId = meta.pedido_id;
          const amountTotalCents = Number(dataObject?.amount_total ?? 0);
          const totalDetails = (dataObject?.total_details as Record<string, unknown> | undefined) ?? {};
          const shippingCents = Number(totalDetails?.amount_shipping ?? 0);
          const taxCents = Number(totalDetails?.amount_tax ?? 0);

          if (!pedidoId) {
            console.warn("[payments-webhook] cookie_order without pedido_id metadata", { sessionId });
            return Response.json({ ok: true, ignored: "no pedido_id" });
          }

          const { data: existing } = await supabaseAdmin
            .from("pedidos")
            .select("id, estado, cliente_id, total")
            .eq("id", pedidoId)
            .maybeSingle();

          if (!existing) {
            console.warn("[payments-webhook] pedido not found", { pedidoId });
            return Response.json({ ok: true, ignored: "pedido not found" });
          }
          if (existing.estado === "pagado") {
            return Response.json({ ok: true, alreadyProcessed: true });
          }

          const update: Record<string, unknown> = {
            estado: "pagado",
            stripe_payment_intent_id: paymentIntentId,
            stripe_checkout_session_id: sessionId,
          };
          if (amountTotalCents > 0) update.total = amountTotalCents / 100;
          if (shippingCents > 0) update.costo_envio = shippingCents / 100;
          if (taxCents > 0) update.impuestos = taxCents / 100;

          const { error: updateErr } = await supabaseAdmin
            .from("pedidos")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .update(update as any)
            .eq("id", existing.id);
          if (updateErr) {
            console.error("[payments-webhook] pedido update failed", updateErr);
            return new Response("Pedido update failed", { status: 500 });
          }

          return Response.json({ ok: true, pedido: existing.id });
        }




        if (
          metaKind === "stars_purchase" &&
          eventType === "checkout.session.completed" &&
          objectId.startsWith("cs_")
        ) {
          const paymentIntentId =
            (dataObject?.payment_intent as string | undefined) ?? null;
          const sessionId = objectId;

          const { data: purchase } = await supabaseAdmin
            .from("star_purchases")
            .select(
              "id, status, package_id, tokens, amount_usd, subject_user_id, subject_email",
            )
            .eq("stripe_session_id", sessionId)
            .maybeSingle();

          if (!purchase) {
            console.warn("[payments-webhook] stars purchase not found", { sessionId });
            return Response.json({ ok: true, ignored: "purchase not found", sessionId });
          }
          if (purchase.status === "completed") {
            return Response.json({ ok: true, alreadyProcessed: true });
          }

          const amount = Number(purchase.amount_usd);
          const platformShare = Math.round((amount / 2) * 100) / 100;
          const poolShare = Math.round((amount - platformShare) * 100) / 100;

          // Insert ledger row (idempotent via UNIQUE(stripe_session_id))
          const { error: ledgerErr } = await supabaseAdmin.from("prize_pool_ledger").insert({
            package_id: purchase.package_id,
            amount_usd: amount,
            tokens_purchased: purchase.tokens,
            platform_share_usd: platformShare,
            pool_share_usd: poolShare,
            subject_user_id: purchase.subject_user_id,
            subject_email: purchase.subject_email,
            stripe_session_id: sessionId,
            stripe_payment_intent_id: paymentIntentId,
            environment,
          });
          const ledgerDuplicate = Boolean(
            ledgerErr && String(ledgerErr.message).includes("duplicate"),
          );
          if (ledgerErr && !ledgerDuplicate) {
            console.error("[payments-webhook] ledger insert failed", ledgerErr);
            return new Response("Ledger insert failed", { status: 500 });
          }

          // Credit tokens to the buyer's user_tokens row
          const tokenFilter = purchase.subject_user_id
            ? supabaseAdmin
                .from("user_tokens")
                .select("id,balance")
                .eq("user_id", purchase.subject_user_id)
                .maybeSingle()
            : purchase.subject_email
              ? supabaseAdmin
                  .from("user_tokens")
                  .select("id,balance")
                  .ilike("guest_email", purchase.subject_email)
                  .maybeSingle()
              : null;

          if (tokenFilter) {
            const { data: row } = await tokenFilter;
            if (row) {
              await supabaseAdmin
                .from("user_tokens")
                .update({ balance: row.balance + purchase.tokens })
                .eq("id", row.id);
            } else {
              await supabaseAdmin.from("user_tokens").insert({
                user_id: purchase.subject_user_id,
                guest_email: purchase.subject_email,
                balance: purchase.tokens,
              });
            }
          }

          // Auto-enter the buyer into the current open draw so every paid
          // contribution to the pool always has at least one participant who
          // can receive the prize. Skipped on duplicate webhook deliveries.
          if (!ledgerDuplicate) {
            try {
              // Ensure today's draw row exists (NY); RPC is idempotent.
              await supabaseAdmin.rpc("ensure_today_draw");

              // Find the next OPEN draw (today if still open, otherwise the
              // next future one). If today is already closed/drawing/completed
              // we create tomorrow's open draw so the buyer is never left out.
              let { data: drawRow } = await supabaseAdmin
                .from("daily_draws")
                .select("draw_date, status")
                .eq("status", "open")
                .order("draw_date", { ascending: true })
                .limit(1)
                .maybeSingle();

              if (!drawRow) {
                // No open draw exists — bootstrap tomorrow's row.
                const { data: latest } = await supabaseAdmin
                  .from("daily_draws")
                  .select("draw_date")
                  .order("draw_date", { ascending: false })
                  .limit(1)
                  .maybeSingle();
                const base = latest?.draw_date
                  ? new Date(latest.draw_date + "T12:00:00Z")
                  : new Date();
                const next = new Date(base);
                next.setUTCDate(next.getUTCDate() + 1);
                const nextDate = next.toISOString().slice(0, 10);
                const scheduledAt = new Date(`${nextDate}T20:00:00-04:00`).toISOString();
                const { data: inserted } = await supabaseAdmin
                  .from("daily_draws")
                  .upsert(
                    { draw_date: nextDate, status: "open", scheduled_at: scheduledAt, prize_usd: 0 },
                    { onConflict: "draw_date" },
                  )
                  .select("draw_date, status")
                  .maybeSingle();
                drawRow = inserted ?? { draw_date: nextDate, status: "open" };
              }

              if (drawRow?.draw_date) {
                // Idempotency: skip if an auto-entry already exists in that draw
                // for this buyer (handles webhook retries).
                const existingQuery = supabaseAdmin
                  .from("daily_draw_entries")
                  .select("id")
                  .eq("draw_date", drawRow.draw_date)
                  .eq("source", "purchase_auto")
                  .limit(1);
                if (purchase.subject_user_id) {
                  existingQuery.eq("subject_user_id", purchase.subject_user_id);
                } else if (purchase.subject_email) {
                  existingQuery.eq("subject_email", purchase.subject_email);
                }
                const { data: existing } = await existingQuery.maybeSingle();

                if (!existing) {
                  const displayName =
                    (purchase.subject_email?.split("@")[0] ?? "Participante")
                      .slice(0, 40) || "Participante";
                  const { error: entryErr } = await supabaseAdmin
                    .from("daily_draw_entries")
                    .insert({
                      draw_date: drawRow.draw_date,
                      subject_user_id: purchase.subject_user_id,
                      subject_email: purchase.subject_email,
                      display_name: displayName,
                      tickets: 1,
                      source: "purchase_auto",
                    });
                  if (entryErr) {
                    console.error("[payments-webhook] auto entry insert failed", entryErr);
                  }
                }
              }
            } catch (e) {
              console.error("[payments-webhook] auto entry flow error", e);
            }
          }


          await supabaseAdmin
            .from("star_purchases")
            .update({ status: "completed" })
            .eq("id", purchase.id);

          return Response.json({ ok: true, stars: purchase.tokens });
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
          await supabaseAdmin.from("donations").update({ status: "failed" }).eq("id", donationId);
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
    const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));

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
