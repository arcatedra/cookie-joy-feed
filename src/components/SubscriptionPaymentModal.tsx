import { useEffect, useMemo, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { createSubscriptionIntent } from "@/lib/subscriptions.functions";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const STRIPE_LOCALES: Record<string, string> = {
  en: "en",
  es: "es",
  pt: "pt-BR",
  de: "de",
  fil: "auto",
};

const MODAL_STRINGS: Record<string, {
  title: string;
  chargingTo: string;
  close: string;
  orPayWith: string;
  payButton: string;
  paymentRejected: string;
  initError: string;
}> = {
  en: {
    title: "Confirm payment",
    chargingTo: "Charging to:",
    close: "Close",
    orPayWith: "or pay with",
    payButton: "Pay and subscribe",
    paymentRejected: "Payment rejected",
    initError: "Error starting payment",
  },
  es: {
    title: "Confirmar pago",
    chargingTo: "Cobramos a:",
    close: "Cerrar",
    orPayWith: "o paga con",
    payButton: "Pagar y suscribirme",
    paymentRejected: "Pago rechazado",
    initError: "Error iniciando el pago",
  },
  pt: {
    title: "Confirmar pagamento",
    chargingTo: "Cobrando a:",
    close: "Fechar",
    orPayWith: "ou pague com",
    payButton: "Pagar e assinar",
    paymentRejected: "Pagamento recusado",
    initError: "Erro ao iniciar o pagamento",
  },
  de: {
    title: "Zahlung bestätigen",
    chargingTo: "Belastet wird:",
    close: "Schließen",
    orPayWith: "oder zahle mit",
    payButton: "Bezahlen und abonnieren",
    paymentRejected: "Zahlung abgelehnt",
    initError: "Fehler beim Starten der Zahlung",
  },
  fil: {
    title: "Kumpirmahin ang bayad",
    chargingTo: "Sisingilin sa:",
    close: "Isara",
    orPayWith: "o magbayad gamit ang",
    payButton: "Magbayad at mag-subscribe",
    paymentRejected: "Tinanggihan ang bayad",
    initError: "May error sa pagsisimula ng bayad",
  },
};

function getStrings(lang: string) {
  const key = (lang ?? "en").slice(0, 3);
  return MODAL_STRINGS[key.startsWith("fil") ? "fil" : key.slice(0, 2)] ?? MODAL_STRINGS.en;
}

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
  const { i18n } = useTranslation();
  const strings = getStrings(i18n.language);
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
        if (alive) setError(e instanceof Error ? e.message : strings.initError);
      });
    return () => {
      alive = false;
    };
  }, [priceId, startIntent, strings.initError]);

  const stripeLocale = STRIPE_LOCALES[i18n.language?.slice(0, 2) ?? "en"] ?? "auto";

  const options = useMemo(
    () =>
      clientSecret
        ? {
            clientSecret,
            appearance: { theme: "stripe" as const },
            locale: stripeLocale as never,
          }
        : null,
    [clientSecret, stripeLocale],
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 sm:items-center">
      <div className="relative flex max-h-[92vh] w-full max-w-md flex-col rounded-t-3xl bg-card shadow-2xl sm:max-h-[90vh] sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 border-b border-border/40 px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground">
              {strings.title}
            </h2>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {strings.chargingTo} <span className="font-semibold">{email}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 items-center justify-center rounded-full bg-primary/10 px-2.5 text-[11px] font-bold uppercase tracking-wider text-primary">
              {(i18n.language ?? "en").slice(0, 2).toUpperCase()}
            </span>
            <LanguageSwitcher variant="light" />
            <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground"
            aria-label={strings.close}
          >
            <X className="h-4 w-4" />
          </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
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
              <PayForm email={email} onSuccess={onSuccess} strings={strings} />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
}

function PayForm({
  email,
  onSuccess,
  strings,
}: {
  email: string;
  onSuccess: () => void;
  strings: ReturnType<typeof getStrings>;
}) {
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
      toast.error(error.message ?? strings.paymentRejected);
      setSubmitting(false);
      return;
    }

    if (paymentIntent && (paymentIntent.status === "succeeded" || paymentIntent.status === "processing")) {
      onSuccess();
    } else {
      setSubmitting(false);
    }
  }

  async function handleExpressConfirm() {
    if (!stripe || !elements) return;
    setSubmitting(true);
    const { error: submitError } = await elements.submit();
    if (submitError) {
      toast.error(submitError.message ?? strings.paymentRejected);
      setSubmitting(false);
      return;
    }
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
      toast.error(error.message ?? strings.paymentRejected);
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
      <ExpressCheckoutElement
        options={{
          buttonHeight: 44,
          paymentMethods: {
            applePay: "auto",
            googlePay: "auto",
            link: "auto",
            paypal: "auto",
            amazonPay: "auto",
          },
          layout: { maxColumns: 1, maxRows: 4 },
        }}
        onConfirm={handleExpressConfirm}
      />
      <div className="relative flex items-center py-1">
        <div className="flex-1 border-t border-border/40" />
        <span className="mx-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {strings.orPayWith}
        </span>
        <div className="flex-1 border-t border-border/40" />
      </div>
      <PaymentElement
        options={{
          layout: {
            type: "accordion",
            defaultCollapsed: false,
            spacedAccordionItems: true,
          },
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
          strings.payButton
        )}
      </button>
    </form>
  );
}
