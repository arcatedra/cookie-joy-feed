import { useEffect, useMemo, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { createSubscriptionIntent } from "@/lib/subscriptions.functions";

let _stripePromise: Promise<Stripe | null> | null = null;
function getStripe() {
  if (!_stripePromise) {
    const pk = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;
    if (!pk) {
      _stripePromise = Promise.resolve(null);
    } else {
      _stripePromise = loadStripe(pk);
    }
  }
  return _stripePromise;
}

interface Props {
  priceId: string;
  email: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function SubscriptionPaymentModal({ priceId, email, onClose, onSuccess }: Props) {
  const startIntent = useServerFn(createSubscriptionIntent);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    startIntent({ data: { priceId } })
      .then((r) => {
        if (alive) setClientSecret(r.clientSecret);
      })
      .catch((e) => {
        console.error(e);
        if (alive) setError(e instanceof Error ? e.message : "Error iniciando el pago");
      });
    return () => {
      alive = false;
    };
  }, [priceId, startIntent]);

  const options = useMemo(
    () =>
      clientSecret
        ? {
            clientSecret,
            appearance: { theme: "stripe" as const },
          }
        : null,
    [clientSecret],
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 sm:items-center">
      <div className="relative w-full max-w-md rounded-t-3xl bg-card p-5 shadow-2xl sm:rounded-3xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="mb-1 text-base font-bold uppercase tracking-wider text-foreground">
          Confirmar pago
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Cobramos al correo de tu cuenta: <span className="font-semibold">{email}</span>
        </p>

        {error && (
          <div className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">{error}</div>
        )}

        {!error && !clientSecret && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {options && (
          <Elements stripe={getStripe()} options={options}>
            <PayForm email={email} onSuccess={onSuccess} />
          </Elements>
        )}
      </div>
    </div>
  );
}

function PayForm({ email, onSuccess }: { email: string; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/subscribe?status=success`,
        payment_method_data: {
          billing_details: { email },
        },
      },
      redirect: "if_required",
    });

    if (error) {
      toast.error(error.message ?? "Pago rechazado");
      setSubmitting(false);
      return;
    }

    if (paymentIntent && (paymentIntent.status === "succeeded" || paymentIntent.status === "processing")) {
      onSuccess();
    } else {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          // Hide the email field entirely — we always use the account email.
          fields: { billingDetails: { email: "never" } },
          wallets: { applePay: "auto", googlePay: "auto" },
        }}
      />
      <button
        type="submit"
        disabled={!stripe || !elements || submitting}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-cta px-5 py-3 text-sm font-bold uppercase tracking-wider text-cta-foreground shadow-md transition-all hover:brightness-105 disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> {t("common.loading")}
          </>
        ) : (
          "Pagar y suscribirme"
        )}
      </button>
    </form>
  );
}
