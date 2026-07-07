/**
 * Webhook receptor de eventos de Stripe Connect para sincronizar el estado
 * de los retiros instantáneos de repartidores.
 *
 * Eventos manejados:
 *   - payout.paid       -> marca driver_payouts.status = 'completado'
 *   - payout.failed     -> marca 'fallido' y revierte saldo (RPC reverse_failed_payout)
 *   - payout.canceled   -> igual que failed
 *   - transfer.failed   -> revierte payout asociado por metadata.payout_id
 *   - account.updated   -> actualiza drivers.stripe_payouts_enabled
 *
 * Configuración en Stripe Dashboard → Developers → Webhooks → Add endpoint
 * (marcar "Connect"). URL:
 *   https://<host>/api/public/stripe/connect-webhook
 * Secret: STRIPE_CONNECT_WEBHOOK_SECRET
 */
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import process from "node:process";

export const Route = createFileRoute("/api/public/stripe/connect-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const signature = request.headers.get("stripe-signature");

        const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
        if (!secret) {
          console.error("[stripe-connect-webhook] Missing STRIPE_CONNECT_WEBHOOK_SECRET");
          return new Response("Server misconfigured", { status: 500 });
        }
        if (!signature || !verifyStripeSignature(body, signature, secret)) {
          console.warn("[stripe-connect-webhook] Signature verification failed");
          return new Response("Invalid signature", { status: 401 });
        }

        let event: {
          id?: string;
          type?: string;
          account?: string;
          data?: { object?: Record<string, unknown> };
        };
        try {
          event = JSON.parse(body);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const eventType = event.type ?? "";
        const obj = event.data?.object ?? {};
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Resolver driver_id desde el stripe_account_id asociado al evento.
        const accountId =
          event.account ??
          (eventType.startsWith("account.") ? (obj.id as string | undefined) : undefined);
        let driverId: string | null = null;
        if (accountId) {
          const { data: driverRow } = await supabaseAdmin
            .from("drivers")
            .select("id")
            .eq("stripe_account_id", accountId)
            .maybeSingle();
          driverId = driverRow?.id ?? null;
        }

        // Log idempotente en stripe_onboarding_events.
        if (event.id) {
          try {
            const { data: inserted, error: logErr } = await supabaseAdmin
              .from("stripe_onboarding_events")
              .upsert(
                {
                  stripe_event_id: event.id,
                  event_type: eventType,
                  driver_id: driverId,
                  payload: event as unknown as import("@/integrations/supabase/types").Json,
                },
                { onConflict: "stripe_event_id", ignoreDuplicates: true },
              )
              .select("id")
              .maybeSingle();
            if (logErr) {
              console.error("[stripe-connect-webhook] log insert error", logErr);
            } else if (!inserted) {
              // Ya procesado: cortar temprano.
              return Response.json({ received: true, duplicate: true });
            }
          } catch (e) {
            console.error("[stripe-connect-webhook] log exception", e);
          }
        }

        try {
          switch (eventType) {
            case "payout.paid": {
              const stripePayoutId = obj.id as string | undefined;
              if (!stripePayoutId) break;
              const { data: payout } = await supabaseAdmin
                .from("driver_payouts")
                .select("id, status")
                .eq("stripe_payout_id", stripePayoutId)
                .maybeSingle();
              if (!payout) {
                console.warn("[stripe-connect-webhook] payout.paid: no match", stripePayoutId);
                break;
              }
              if (payout.status === "completado") break; // idempotente
              await supabaseAdmin.rpc("complete_driver_payout", {
                p_payout_id: payout.id,
                p_stripe_payout_id: stripePayoutId,
              });
              break;
            }

            case "payout.failed":
            case "payout.canceled": {
              const stripePayoutId = obj.id as string | undefined;
              const reason =
                (obj.failure_message as string | undefined) ??
                (obj.failure_code as string | undefined) ??
                eventType;
              if (!stripePayoutId) break;
              const { data: payout } = await supabaseAdmin
                .from("driver_payouts")
                .select("id, status")
                .eq("stripe_payout_id", stripePayoutId)
                .maybeSingle();
              if (!payout) {
                console.warn("[stripe-connect-webhook] payout.failed: no match", stripePayoutId);
                break;
              }
              if (payout.status === "fallido") break;
              await supabaseAdmin.rpc("reverse_failed_payout", {
                p_payout_id: payout.id,
                p_reason: reason.slice(0, 300),
              });
              break;
            }

            case "transfer.failed": {
              // El transfer de plataforma → cuenta conectada falló; el id del payout
              // interno viaja en metadata.payout_id (setado al crear el transfer).
              const meta = (obj.metadata as Record<string, string> | undefined) ?? {};
              const payoutId = meta.payout_id;
              const reason =
                (obj.failure_message as string | undefined) ?? "transfer.failed";
              if (!payoutId) break;
              const { data: payout } = await supabaseAdmin
                .from("driver_payouts")
                .select("id, status")
                .eq("id", payoutId)
                .maybeSingle();
              if (!payout || payout.status === "fallido") break;
              await supabaseAdmin.rpc("reverse_failed_payout", {
                p_payout_id: payout.id,
                p_reason: reason.slice(0, 300),
              });
              break;
            }

            case "account.updated": {
              const accountId = (obj.id as string | undefined) ?? event.account;
              if (!accountId) break;
              const payoutsEnabled = Boolean(obj.payouts_enabled);
              const chargesEnabled = Boolean(obj.charges_enabled);
              await supabaseAdmin
                .from("drivers")
                .update({
                  stripe_payouts_enabled: payoutsEnabled && chargesEnabled,
                })
                .eq("stripe_account_id", accountId);
              break;
            }

            default:
              // Otros eventos se ignoran silenciosamente pero devolvemos 200 para
              // que Stripe no reintente.
              break;
          }
        } catch (err) {
          console.error("[stripe-connect-webhook] handler error", eventType, err);
          // Devolvemos 500 para que Stripe reintente el evento
          return new Response("Handler error", { status: 500 });
        }

        return Response.json({ received: true });
      },

      GET: async () =>
        new Response("Stripe Connect webhook. POST only.", {
          status: 405,
          headers: { Allow: "POST" },
        }),
    },
  },
});

/**
 * Verifica la firma de Stripe: header formato `t=<ts>,v1=<hex>`.
 * Rechaza timestamps con más de 5 minutos de antigüedad.
 */
function verifyStripeSignature(body: string, header: string, secret: string): boolean {
  const parts = header.split(",").map((p) => p.trim());
  const tsPart = parts.find((p) => p.startsWith("t="))?.slice(2);
  const sigs = parts.filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!tsPart || sigs.length === 0) return false;

  const ts = Number(tsPart);
  if (!Number.isFinite(ts)) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - ts) > 300) return false;

  const expected = createHmac("sha256", secret).update(`${tsPart}.${body}`).digest("hex");
  const expectedBuf = Buffer.from(expected);
  return sigs.some((sig) => {
    const sigBuf = Buffer.from(sig);
    if (sigBuf.length !== expectedBuf.length) return false;
    try {
      return timingSafeEqual(sigBuf, expectedBuf);
    } catch {
      return false;
    }
  });
}
