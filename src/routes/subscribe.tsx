import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, Check, Calendar as CalendarIcon, Sparkles, X } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/subscribe")({
  head: () => ({
    meta: [
      { title: "Subscription Plans — Oys" },
      {
        name: "description",
        content:
          "Choose your Oys cookie subscription plan. Delivered Mondays and Fridays only.",
      },
    ],
  }),
  component: SubscribePage,
});

interface Tier {
  id: string;
  title: string;
  cadence: string;
  description: string;
  price: string;
  maxDeliveries: number;
  badgeColor: string;
  badgeTextColor: string;
  accentColor: string;
  popular?: boolean;
}

const tiers: Tier[] = [
  {
    id: "starter",
    title: "Starter Plan",
    cadence: "2 DELIVERIES / MONTH",
    description:
      "Perfect for essentials. Schedule up to 2 deliveries per month on your choice of Mondays or Fridays.",
    price: "$14.99",
    maxDeliveries: 2,
    badgeColor: "bg-[oklch(0.85_0.06_150)]",
    badgeTextColor: "text-[oklch(0.28_0.05_150)]",
    accentColor: "bg-[oklch(0.78_0.06_150)]",
  },
  {
    id: "essential",
    title: "Essential Plan",
    cadence: "4 DELIVERIES / MONTH",
    description:
      "Our most popular choice. Enjoy up to 4 deliveries per month. Flexible scheduling: use them weekly, bi-weekly, or however fits your routine.",
    price: "$29.99",
    maxDeliveries: 4,
    badgeColor: "bg-[oklch(0.85_0.08_280)]",
    badgeTextColor: "text-[oklch(0.28_0.06_280)]",
    accentColor: "bg-[oklch(0.78_0.08_280)]",
    popular: true,
  },
  {
    id: "intermediate",
    title: "Intermediate Plan",
    cadence: "6 DELIVERIES / MONTH",
    description:
      "Extra flexibility for active households. Get up to 6 deliveries per month scheduled on Mondays or Fridays.",
    price: "$44.99",
    maxDeliveries: 6,
    badgeColor: "bg-[oklch(0.85_0.10_80)]",
    badgeTextColor: "text-[oklch(0.32_0.08_80)]",
    accentColor: "bg-[oklch(0.80_0.12_80)]",
  },
  {
    id: "premium",
    title: "Premium Plan",
    cadence: "8 DELIVERIES / MONTH",
    description:
      "Full monthly coverage. Maximum convenience with up to 8 deliveries per month (twice a week on Mondays and Fridays).",
    price: "$59.99",
    maxDeliveries: 8,
    badgeColor: "bg-[oklch(0.82_0.12_50)]",
    badgeTextColor: "text-[oklch(0.28_0.06_50)]",
    accentColor: "bg-[oklch(0.72_0.14_50)]",
  },
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startDay = first.getDay(); // 0 Sun..6 Sat
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

function SubscribePage() {
  const today = useMemo(() => new Date(), []);
  const [selectedTierId, setSelectedTierId] = useState<string>("essential");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const selectedTier = tiers.find((t) => t.id === selectedTierId)!;
  const remaining = selectedTier.maxDeliveries - selectedDates.length;
  const grid = useMemo(() => getMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

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

  function selectTier(id: string) {
    setSelectedTierId(id);
    const max = tiers.find((t) => t.id === id)!.maxDeliveries;
    setSelectedDates((prev) => prev.slice(0, max));
  }

  return (
    <main className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="relative bg-primary px-5 pb-7 pt-12 text-primary-foreground">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/10"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-bold uppercase tracking-[0.15em]">
            Subscription Plans
          </h1>
          <div className="h-10 w-10" />
        </div>
        <div className="mt-5 flex justify-center">
          <span className="rounded-full bg-cta px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-cta-foreground">
            Monday & Friday Delivery Only
          </span>
        </div>
      </header>

      {/* Active plan summary / counter */}
      <section className="-mt-5 px-5">
        <div className="rounded-2xl bg-card p-4 shadow-lg ring-1 ring-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Active Plan
              </p>
              <p className="mt-0.5 text-base font-bold text-foreground">{selectedTier.title}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Remaining
              </p>
              <p className="mt-0.5 text-base font-extrabold text-primary">
                {remaining} / {selectedTier.maxDeliveries}
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
            {selectedDates.length} of {selectedTier.maxDeliveries} deliveries scheduled this month
          </p>
        </div>
      </section>

      {/* Tier cards */}
      <section className="px-5 pt-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-foreground">
          Choose Your Plan
        </h2>
        <div className="flex flex-col gap-4">
          {tiers.map((tier) => {
            const isSelected = selectedTierId === tier.id;
            return (
              <article
                key={tier.id}
                className={`relative overflow-hidden rounded-2xl bg-card p-5 shadow-md transition-all duration-300 ${
                  isSelected
                    ? "ring-2 ring-primary"
                    : "ring-1 ring-border"
                }`}
              >
                {tier.popular && (
                  <div className="absolute right-0 top-0 flex items-center gap-1 rounded-bl-2xl bg-cta px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-cta-foreground shadow-md">
                    <Sparkles className="h-3 w-3" /> Most Popular
                  </div>
                )}

                <span
                  className={`inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${tier.badgeColor} ${tier.badgeTextColor}`}
                >
                  {tier.cadence}
                </span>

                <h3 className="mt-3 text-xl font-bold text-foreground">{tier.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {tier.description}
                </p>

                <div className="my-4 h-px bg-border" />

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-extrabold text-primary">{tier.price}</span>
                    <span className="text-sm font-medium text-muted-foreground"> / mo.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => selectTier(tier.id)}
                    className={`flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider shadow-md transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-cta text-cta-foreground hover:brightness-105"
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> Selected
                      </>
                    ) : (
                      "Sign Up"
                    )}
                  </button>
                </div>

                <div className={`absolute inset-x-0 bottom-0 h-1 ${tier.accentColor} opacity-70`} />
              </article>
            );
          })}
        </div>
      </section>

      {/* Scheduler */}
      <section className="px-5 pt-8">
        <div className="rounded-2xl bg-card p-5 shadow-md ring-1 ring-border">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Schedule Deliveries
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Only Mondays and Fridays are selectable.
          </p>

          {/* Month nav */}
          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-bold text-foreground">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </p>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground"
              aria-label="Next month"
            >
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </button>
          </div>

          {/* Day headers */}
          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="py-1">{d}</div>
            ))}
          </div>

          {/* Grid */}
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
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          {/* Selected list */}
          {selectedDates.length > 0 && (
            <div className="mt-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Your Deliveries
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {selectedDates
                  .slice()
                  .sort()
                  .map((k) => {
                    const [y, m, d] = k.split("-").map(Number);
                    const date = new Date(y, m, d);
                    const label = date.toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    });
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
                          aria-label={`Remove ${label}`}
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
              You've used all {selectedTier.maxDeliveries} deliveries on this plan. Upgrade to add more.
            </p>
          )}
        </div>
      </section>

      <footer className="mt-6 px-5 pb-4 text-center">
        <p className="text-xs font-medium italic text-muted-foreground">
          *Available Only on MONDAYS & FRIDAYS
        </p>
      </footer>

      <BottomNav />
    </main>
  );
}
