import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/subscribe")({
  head: () => ({
    meta: [
      { title: "Subscription Plans — Oys" },
      { name: "description", content: "Choose your Oys cookie subscription plan. Delivered Mondays and Thursdays." },
    ],
  }),
  component: SubscribePage,
});

interface Tier {
  id: string;
  title: string;
  tag: string;
  description: string;
  price: string;
  badgeColor: string;
  badgeTextColor: string;
  borderColor: string;
  accentColor: string;
}

const tiers: Tier[] = [
  {
    id: "basic",
    title: "Basic Tier",
    tag: "1 DELIVERY PER WEEK",
    description: "Choose either MONDAY or THURSDAY. Single Delivery Option. Reliable Weekly Service.",
    price: "$19.99 / mo.",
    badgeColor: "bg-[oklch(0.78_0.06_150)]",
    badgeTextColor: "text-[oklch(0.25_0.04_150)]",
    borderColor: "border-[oklch(0.78_0.06_150)]",
    accentColor: "bg-[oklch(0.78_0.06_150)]",
  },
  {
    id: "medium",
    title: "Medium Tier",
    tag: "2 DELIVERIES PER WEEK",
    description: "Delivered both MONDAY & THURSDAY. Twice-Weekly Option. Consistent Service Each Week.",
    price: "$34.99 / mo.",
    badgeColor: "bg-[oklch(0.78_0.08_280)]",
    badgeTextColor: "text-[oklch(0.25_0.06_280)]",
    borderColor: "border-[oklch(0.78_0.08_280)]",
    accentColor: "bg-[oklch(0.78_0.08_280)]",
  },
  {
    id: "advanced",
    title: "Advanced Tier",
    tag: "UP TO 4 DELIVERIES PER MONTH",
    description: "Choose specific MONDAYS or THURSDAYS. Customizable Monthly Plan. Total Flexibility Up to 4 Slots.",
    price: "$59.99 / mo.",
    badgeColor: "bg-[oklch(0.80_0.12_80)]",
    badgeTextColor: "text-[oklch(0.30_0.08_80)]",
    borderColor: "border-[oklch(0.80_0.12_80)]",
    accentColor: "bg-[oklch(0.80_0.12_80)]",
  },
  {
    id: "elite",
    title: "Elite Tier",
    tag: "UP TO 8 DELIVERIES PER MONTH",
    description: "ALL-ACCESS Option. Maximum Availability on Mon & Thu. Unlimited Potential on Delivery Days.",
    price: "$99.99 / mo.",
    badgeColor: "bg-[oklch(0.72_0.14_50)]",
    badgeTextColor: "text-[oklch(0.25_0.06_50)]",
    borderColor: "border-[oklch(0.72_0.14_50)]",
    accentColor: "bg-[oklch(0.72_0.14_50)]",
  },
];

function ToggleSwitch({ active, onChange }: { active: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={onChange}
      className={`relative h-7 w-12 rounded-full transition-colors duration-300 ${
        active ? "bg-primary" : "bg-muted"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-300 ${
          active ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function SubscribePage() {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-5 pt-12 pb-6">
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

        {/* Service Badge */}
        <div className="mt-5 flex justify-center">
          <span className="rounded-full bg-cta px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-cta-foreground">
            Monday & Thursday Delivery Service
          </span>
        </div>
      </header>

      {/* Tiers Stack */}
      <section className="px-5 pt-6">
        <div className="flex flex-col gap-5">
          {tiers.map((tier) => {
            const isSelected = selectedTier === tier.id;
            return (
              <article
                key={tier.id}
                className={`relative overflow-hidden rounded-2xl bg-card p-5 shadow-md ring-1 transition-all duration-300 ${
                  isSelected ? `${tier.borderColor} ring-2` : "border-border ring-1 ring-border"
                }`}
              >
                {/* Top row: badge + toggle */}
                <div className="flex items-start justify-between">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${tier.badgeColor} ${tier.badgeTextColor}`}
                  >
                    {tier.tag}
                  </span>
                  <ToggleSwitch
                    active={isSelected}
                    onChange={() =>
                      setSelectedTier((prev) => (prev === tier.id ? null : tier.id))
                    }
                  />
                </div>

                {/* Title */}
                <h2 className="mt-4 text-xl font-bold text-foreground">{tier.title}</h2>

                {/* Description */}
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {tier.description}
                </p>

                {/* Divider */}
                <div className="my-4 h-px bg-border" />

                {/* Price + CTA */}
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-extrabold text-primary">{tier.price}</span>
                  <button
                    className={`rounded-full px-5 py-2.5 text-sm font-bold shadow-md transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-cta text-cta-foreground hover:brightness-105"
                    }`}
                  >
                    SIGN UP NOW
                  </button>
                </div>

                {/* Decorative accent bar */}
                <div
                  className={`absolute bottom-0 left-0 right-0 h-1 ${tier.accentColor} opacity-60`}
                />
              </article>
            );
          })}
        </div>
      </section>

      {/* Footer note */}
      <footer className="mt-6 px-5 pb-4 text-center">
        <p className="text-xs font-medium italic text-muted-foreground">
          *Available Only on MONDAYS & THURSDAYS
        </p>
      </footer>

      <BottomNav />
    </main>
  );
}
