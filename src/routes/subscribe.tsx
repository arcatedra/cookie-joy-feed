import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Check, Calendar as CalendarIcon, Sparkles, X, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { formatPrice, formatDate, formatNumber, getLocale } from "@/i18n";
import { useAuth } from "@/lib/auth";
import { useSubscriptionGate } from "@/lib/subscription-gate";
import { createSubscriptionCheckout } from "@/lib/subscriptions.functions";



export const Route = createFileRoute("/subscribe")({
  head: () => ({
    meta: [
      { title: "Subscription Plans — AMYRAX" },
      {
        name: "description",
        content:
          "Choose your AMYRAX cookie subscription plan. Delivered Mondays and Fridays only.",
      },
    ],
  }),
  component: SubscribePage,
});

interface Tier {
  id: "starter" | "essential" | "intermediate" | "premium";
  price: number;
  maxDeliveries: number;
  badgeColor: string;
  badgeTextColor: string;
  accentColor: string;
  popular?: boolean;
}

const tiers: Tier[] = [
  {
    id: "starter",
    price: 14.99,
    maxDeliveries: 2,
    badgeColor: "bg-[oklch(0.85_0.06_150)]",
    badgeTextColor: "text-[oklch(0.28_0.05_150)]",
    accentColor: "bg-[oklch(0.78_0.06_150)]",
  },
  {
    id: "essential",
    price: 29.99,
    maxDeliveries: 4,
    badgeColor: "bg-[oklch(0.85_0.08_280)]",
    badgeTextColor: "text-[oklch(0.28_0.06_280)]",
    accentColor: "bg-[oklch(0.78_0.08_280)]",
    popular: true,
  },
  {
    id: "intermediate",
    price: 44.99,
    maxDeliveries: 6,
    badgeColor: "bg-[oklch(0.85_0.10_80)]",
    badgeTextColor: "text-[oklch(0.32_0.08_80)]",
    accentColor: "bg-[oklch(0.80_0.12_80)]",
  },
  {
    id: "premium",
    price: 59.99,
    maxDeliveries: 8,
    badgeColor: "bg-[oklch(0.82_0.12_50)]",
    badgeTextColor: "text-[oklch(0.28_0.06_50)]",
    accentColor: "bg-[oklch(0.72_0.14_50)]",
  },
];

function getMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ date: Date | null }> = [];
  for (let i = 0; i < startDay; i++) cells.push({ date: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(year, month, d) });
  while (cells.length % 7 !== 0) cells.push({ date: null });
  return cells;
}

function isMondayOrFriday(d: Date) {
  const day = d.getDay();
  return day === 1 || day === 5;
}

function fmtKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

const TIER_TO_PRICE: Record<Tier["id"], string> = {
  starter: "plan_starter_monthly",
  essential: "plan_essential_monthly",
  intermediate: "plan_intermediate_monthly",
  premium: "plan_premium_monthly",
};

function SubscribePage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const gate = useSubscriptionGate();
  const startCheckout = useServerFn(createSubscriptionCheckout);
  const [checkoutLoadingId, setCheckoutLoadingId] = useState<Tier["id"] | null>(null);
  const [, setActivating] = useState(false);
  const today = useMemo(() => new Date(), []);
  const [selectedTierId, setSelectedTierId] = useState<Tier["id"]>("essential");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // On return from Stripe checkout (?status=success), poll the subscription
  // status until the webhook upserts the row, then update the UI without a reload.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    if (!status) return;
    // Clean the URL so a refresh doesn't re-trigger this effect.
    params.delete("status");
    params.delete("session_id");
    const clean = window.location.pathname + (params.toString() ? `?${params}` : "");
    window.history.replaceState({}, "", clean);

    if (status === "cancel") {
      toast.message("Checkout cancelado.");
      return;
    }
    if (status !== "success") return;

    setActivating(true);
    const toastId = toast.loading("Activando tu suscripción…");

    const verify = async () => {
      // First attempt: 20s window.
      const first = await gate.refreshUntilActive(20_000);
      if (first.active) return first;

      // Auto-retry once with a longer window and a clear message.
      toast.loading(
        first.errors > 0
          ? "Reintentando verificación… estamos confirmando tu pago."
          : "Aún esperando confirmación del pago… reintentando.",
        { id: toastId },
      );
      const second = await gate.refreshUntilActive(20_000);
      return second;
    };

    verify()
      .then((result) => {
        if (result.active) {
          toast.success(
            "¡Suscripción activada! Ya puedes comprar y programar entregas.",
            { id: toastId },
          );
        } else if (result.errors > 0) {
          toast.error(
            "No pudimos verificar la activación automáticamente. Tu pago llegó a Stripe; pulsa Reintentar.",
            {
              id: toastId,
              duration: Infinity,
              action: {
                label: "Reintentar",
                onClick: () => {
                  const retryId = toast.loading("Verificando suscripción…");
                  gate
                    .refreshUntilActive(25_000)
                    .then((r) => {
                      if (r.active) {
                        toast.success("¡Suscripción activada!", { id: retryId });
                      } else {
                        toast.error(
                          "Sigue sin confirmarse. Contáctanos si el cobro ya aparece en tu banco.",
                          { id: retryId },
                        );
                      }
                    })
                    .catch((e) => {
                      toast.error(
                        e instanceof Error ? e.message : "Error verificando la suscripción.",
                        { id: retryId },
                      );
                    });
                },
              },
            },
          );
        } else {
          toast.message(
            "Tu pago se procesó. La activación puede tardar unos segundos — actualizaremos esta página automáticamente.",
            { id: toastId, duration: 8000 },
          );
        }
      })
      .catch((e) => {
        toast.error(
          e instanceof Error ? e.message : "Error inesperado verificando la suscripción.",
          { id: toastId },
        );
      })
      .finally(() => setActivating(false));
  }, [gate]);




  const selectedTier = tiers.find((t) => t.id === selectedTierId)!;
  const remaining = selectedTier.maxDeliveries - selectedDates.length;
  const grid = useMemo(() => getMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const monthLabel = new Intl.DateTimeFormat(getLocale(i18n.language), {
    month: "long",
    year: "numeric",
  }).format(new Date(viewYear, viewMonth, 1));

  const weekdayHeaders = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(getLocale(i18n.language), { weekday: "narrow" });
    // Sunday = base date 2024-06-02 (Sun)
    const base = new Date(2024, 5, 2);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return fmt.format(d);
    });
  }, [i18n.language]);

  function toggleDate(d: Date) {
    if (!isMondayOrFriday(d)) return;
    const key = fmtKey(d);
    setSelectedDates((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= selectedTier.maxDeliveries) return prev;
      return [...prev, key];
    });
  }

  function changeMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  }

  function selectTier(id: Tier["id"]) {
    setSelectedTierId(id);
    const max = tiers.find((t) => t.id === id)!.maxDeliveries;
    setSelectedDates((prev) => prev.slice(0, max));
  }

  async function handleSubscribe(id: Tier["id"]) {
    if (!user) {
      toast.error(t("auth.signInToLike", { defaultValue: "Inicia sesión para suscribirte" }));
      return;
    }
    setCheckoutLoadingId(id);
    try {
      const result = await startCheckout({ data: { priceId: TIER_TO_PRICE[id] } });
      if (result?.url) {
        window.location.href = result.url;
      } else {
        throw new Error("Stripe no devolvió una URL de checkout.");
      }
    } catch (e) {
      console.error(e);
      toast.error("No se pudo iniciar el checkout. Inténtalo de nuevo.");
      setCheckoutLoadingId(null);
    }
  }


  return (
    <main className="min-h-screen bg-background pb-28">
      <header className="relative bg-primary px-5 pb-7 pt-12 text-primary-foreground">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/10"
            aria-label={t("common.back")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-bold uppercase tracking-[0.15em]">
            {t("subscribe.title")}
          </h1>
          <LanguageSwitcher />
        </div>
        <div className="mt-5 flex justify-center">
          <span className="rounded-full bg-cta px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-cta-foreground">
            {t("subscribe.deliveryBadge")}
          </span>
        </div>
      </header>

      <section className="-mt-5 px-5">
        <div className="rounded-2xl bg-card p-4 shadow-lg ring-1 ring-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("subscribe.activePlan")}
              </p>
              <p className="mt-0.5 text-base font-bold text-foreground">{t(`subscribe.tiers.${selectedTier.id}.title`)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("subscribe.remaining")}
              </p>
              <p className="mt-0.5 text-base font-extrabold text-primary">
                {formatNumber(remaining, i18n.language)} / {formatNumber(selectedTier.maxDeliveries, i18n.language)}
              </p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{
                width: `${(selectedDates.length / selectedTier.maxDeliveries) * 100}%`,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("subscribe.scheduledCount", { used: selectedDates.length, total: selectedTier.maxDeliveries })}
          </p>
        </div>
      </section>

      <section className="px-5 pt-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-foreground">
          {t("subscribe.choosePlan")}
        </h2>
        <div className="flex flex-col gap-4">
          {tiers.map((tier) => {
            const isSelected = selectedTierId === tier.id;
            return (
              <article
                key={tier.id}
                className={`relative overflow-hidden rounded-2xl bg-card p-5 shadow-md transition-all duration-300 ${
                  isSelected ? "ring-2 ring-primary" : "ring-1 ring-border"
                }`}
              >
                {tier.popular && (
                  <div className="absolute right-0 top-0 flex items-center gap-1 rounded-bl-2xl bg-cta px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-cta-foreground shadow-md">
                    <Sparkles className="h-3 w-3" /> {t("subscribe.mostPopular")}
                  </div>
                )}

                <span
                  className={`inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${tier.badgeColor} ${tier.badgeTextColor}`}
                >
                  {t(`subscribe.tiers.${tier.id}.cadence`)}
                </span>

                <h3 className="mt-3 text-xl font-bold text-foreground">{t(`subscribe.tiers.${tier.id}.title`)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {t(`subscribe.tiers.${tier.id}.desc`)}
                </p>

                <div className="my-4 h-px bg-border" />

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-extrabold text-primary">{formatPrice(tier.price, i18n.language)}</span>
                    <span className="text-sm font-medium text-muted-foreground"> {t("subscribe.perMonth")}</span>
                  </div>
                  <button
                    type="button"
                    disabled={checkoutLoadingId === tier.id}
                    onClick={() => (isSelected ? handleSubscribe(tier.id) : selectTier(tier.id))}
                    className={`flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider shadow-md transition-all disabled:opacity-60 ${
                      isSelected
                        ? "bg-cta text-cta-foreground hover:brightness-105"
                        : "bg-primary text-primary-foreground hover:brightness-110"
                    }`}
                  >
                    {checkoutLoadingId === tier.id ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("common.loading")}
                      </>
                    ) : isSelected ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> {t("common.signUp")}
                      </>
                    ) : (
                      t("common.selected", { defaultValue: "Elegir" })
                    )}
                  </button>

                </div>

                <div className={`absolute inset-x-0 bottom-0 h-1 ${tier.accentColor} opacity-70`} />
              </article>
            );
          })}
        </div>
      </section>

      <section className="px-5 pt-8">
        <div className="rounded-2xl bg-card p-5 shadow-md ring-1 ring-border">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              {t("subscribe.schedule")}
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("subscribe.scheduleHint")}
          </p>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground"
              aria-label={t("subscribe.prevMonth")}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-bold text-foreground capitalize">
              {monthLabel}
            </p>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground"
              aria-label={t("subscribe.nextMonth")}
            >
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {weekdayHeaders.map((d, i) => (
              <div key={i} className="py-1">{d}</div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {grid.map((cell, i) => {
              if (!cell.date) return <div key={i} className="aspect-square" />;
              const d = cell.date;
              const allowed = isMondayOrFriday(d);
              const key = fmtKey(d);
              const isSel = selectedDates.includes(key);
              const past = d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const disabled = !allowed || past;
              const isToday = fmtKey(d) === fmtKey(today);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleDate(d)}
                  className={`aspect-square rounded-lg text-xs font-semibold transition-all ${
                    isSel
                      ? "bg-primary text-primary-foreground shadow-md"
                      : disabled
                      ? "text-muted-foreground/40"
                      : "bg-muted text-foreground hover:bg-cta hover:text-cta-foreground"
                  } ${isToday && !isSel ? "ring-1 ring-primary" : ""}`}
                >
                  {formatNumber(d.getDate(), i18n.language)}
                </button>
              );
            })}
          </div>

          {selectedDates.length > 0 && (
            <div className="mt-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("subscribe.yourDeliveries")}
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {selectedDates
                  .slice()
                  .sort()
                  .map((k) => {
                    const [y, m, d] = k.split("-").map(Number);
                    const date = new Date(y, m, d);
                    const label = formatDate(date, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    }, i18n.language);
                    return (
                      <li
                        key={k}
                        className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                      >
                        {label}
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedDates((prev) => prev.filter((x) => x !== k))
                          }
                          className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 hover:bg-primary/30"
                          aria-label={t("subscribe.removeDate", { date: label })}
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}

          {remaining === 0 && (
            <p className="mt-4 rounded-lg bg-cta/15 px-3 py-2 text-xs font-semibold text-foreground">
              {t("subscribe.usedAll", { count: selectedTier.maxDeliveries })}
            </p>
          )}
        </div>
      </section>

      <footer className="mt-6 px-5 pb-4 text-center">
        <p className="text-xs font-medium italic text-muted-foreground">
          {t("subscribe.footnote")}
        </p>
      </footer>


    </main>
  );
}
