import { createFileRoute } from "@tanstack/react-router";
import {
  Settings,
  Heart,
  CreditCard,
  SlidersHorizontal,
  HelpCircle,
  ChevronRight,
  Award,
  Cookie,
  X,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BottomNav } from "@/components/BottomNav";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { formatDate, formatNumber } from "@/i18n";
import avatar from "@/assets/avatar.jpg";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — Oys" },
      { name: "description", content: "Manage your Oys account, orders, and subscription." },
    ],
  }),
  component: ProfilePage,
});

const menuItems = [
  { key: "favorites", Icon: Heart },
  { key: "payment", Icon: CreditCard },
  { key: "general", Icon: SlidersHorizontal },
  { key: "help", Icon: HelpCircle },
] as const;

function ProfilePage() {
  const { t, i18n } = useTranslation();
  const [sheet, setSheet] = useState<string | null>(null);
  const orderDate = formatDate(new Date(2023, 8, 26), { year: "numeric", month: "short", day: "numeric" }, i18n.language);

  return (
    <main className="min-h-screen bg-background pb-24">
      {/* Top blue banner */}
      <header className="relative bg-primary px-5 pt-12 pb-20">
        <div className="flex items-center justify-between">
          <LanguageSwitcher />
          <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-bold uppercase tracking-[0.15em] text-primary-foreground">
            {t("profile.title")}
          </h1>
          <button
            type="button"
            onClick={() => setSheet("settings")}
            className="grid h-10 w-10 place-items-center rounded-full bg-primary-foreground/10 text-primary-foreground"
            aria-label={t("profile.settings")}
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Profile card */}
      <section className="relative -mt-14 px-5">
        <div className="rounded-3xl bg-card p-6 shadow-lg ring-1 ring-border">
          <div className="flex justify-center -mt-14">
            <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-cream shadow-md">
              <img
                src={avatar}
                alt="Alex R."
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>

          <div className="mt-4 text-center">
            <h2 className="text-xl font-bold text-foreground">Alex R.</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{t("profile.city")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("profile.joined")}</p>
          </div>

          <div className="mt-5 flex items-center justify-around">
            <div className="flex flex-col items-center px-4">
              <span className="text-lg font-bold text-foreground">{formatNumber(28, i18n.language)}</span>
              <span className="text-[11px] font-medium text-muted-foreground">{t("profile.orders")}</span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex flex-col items-center px-4">
              <span className="text-lg font-bold text-foreground">{formatNumber(12, i18n.language)}</span>
              <span className="text-[11px] font-medium text-muted-foreground">{t("profile.favorites")}</span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex flex-col items-center px-4">
              <span className="text-lg font-bold text-foreground">{t("profile.cookieFan")}</span>
              <span className="text-[11px] font-medium text-muted-foreground">{t("profile.level")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Active Plan */}
      <section className="mt-6 px-5">
        <div className="flex items-center justify-between rounded-2xl bg-primary p-4 text-primary-foreground shadow-lg">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary-foreground/10">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-primary-foreground/70">{t("profile.currentPlan")}</p>
              <p className="text-sm font-bold">{t("profile.enthusiast")}</p>
            </div>
          </div>
          <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-bold text-green-400">
            {t("profile.active")}
          </span>
        </div>
      </section>

      {/* Recent Orders */}
      <section className="mt-6 px-5">
        <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-foreground">
          {t("profile.recentOrders")}
        </h3>
        <div className="mt-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-cream">
                <Cookie className="h-5 w-5 text-brown" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{t("profile.order", { id: 1023 })}</p>
                <p className="text-xs text-muted-foreground">{t("profile.orderItems")}</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">{orderDate}</span>
          </div>
        </div>
      </section>

      {/* Account Navigation */}
      <section className="mt-6 px-5">
        <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-foreground">
          {t("profile.account")}
        </h3>
        <div className="mt-3 rounded-2xl bg-card shadow-sm ring-1 ring-border overflow-hidden">
          {menuItems.map((item, i) => (
            <button
              key={item.key}
              className={`flex w-full items-center justify-between px-4 py-3.5 text-left transition hover:bg-accent ${
                i !== menuItems.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <item.Icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">{t(`profile.menu.${item.key}`)}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
