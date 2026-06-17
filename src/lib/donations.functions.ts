import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequestHost } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tierForAmount } from "./donation-tier";

const checkoutSchema = z.object({
  amount: z.number().positive().min(1).max(1_000_000),
});

interface StripeCheckoutSession {
  id: string;
  url: string;
}

export const createDonationCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => checkoutSchema.parse(data))
  .handler(async ({ data, context }) => {
    const amount = Math.round(data.amount * 100) / 100; // normalize to cents-friendly
    const tier = tierForAmount(amount);
    if (!tier) throw new Error("El monto mínimo de donación es $1 USD.");

    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { stripePost, paymentsEnvironmentForHost } = await import("./stripe.server");

    // Create the donation row first so we have an id to use as metadata.
    const { data: donation, error: insertErr } = await supabaseAdmin
      .from("donations")
      .insert({
        user_id: userId,
        amount,
        currency: "usd",
        tier,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertErr || !donation) {
      console.error("[donations] insert failed", insertErr);
      throw new Error("No se pudo crear la donación. Inténtalo de nuevo.");
    }

    // Build origin from the incoming request so dev/preview/prod all work.
    const host = getRequestHost();
    const env = paymentsEnvironmentForHost(host);
    const proto = host?.startsWith("localhost") ? "http" : "https";
    const origin = `${proto}://${host}`;

    let session: StripeCheckoutSession;
    try {
      session = await stripePost<StripeCheckoutSession>("/v1/checkout/sessions", {
        mode: "payment",
        success_url: `${origin}/donate?status=success&donation_id=${donation.id}`,
        cancel_url: `${origin}/donate?status=cancel&donation_id=${donation.id}`,
        client_reference_id: donation.id,
        metadata: { donation_id: donation.id, tier, user_id: userId },
        payment_intent_data: {
          metadata: { donation_id: donation.id, tier, user_id: userId },
          description: `Donación AMYRAX — ${tier}`,
        },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: Math.round(amount * 100),
              product_data: {
                name: `Donación AMYRAX — ${tier}`,
                description: "Gracias por apoyar a AMYRAX.",
              },
            },
          },
        ],
      }, env);
    } catch (e) {
      // Roll back the donation row if Stripe rejected the session.
      await supabaseAdmin.from("donations").delete().eq("id", donation.id);
      throw e;
    }

    // Persist the session id so the webhook can match this row.
    await supabaseAdmin
      .from("donations")
      .update({ stripe_session_id: session.id })
      .eq("id", donation.id);

    // Silence the unused-import warning for `supabase` — keep it imported in case
    // future logic needs the per-user RLS client.
    void supabase;

    return { url: session.url, donationId: donation.id, tier };
  });

export const getMyDonations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("donations")
      .select("id, amount, currency, tier, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) { console.error("[donations] list failed", error); throw new Error("No se pudieron cargar las donaciones."); }
    return { donations: data ?? [] };
  });
