import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Settings,
  Heart,
  CreditCard,
  SlidersHorizontal,
  HelpCircle,
  ChevronRight,
  Award,
  Cookie,
  LogOut,
  LogIn,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { formatDate, formatNumber } from "@/i18n";
import { useAuth } from "@/lib/auth";
import { ReferralCard } from "@/components/ReferralCard";
import { TierBadge } from "@/components/TierBadge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyDonationTier } from "@/lib/donations.functions";
import type { DonationTier } from "@/lib/donation-tier";
import { SubscribePromoBanner } from "@/lib/subscription-gate";
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
      { title: "My Profile — AMYRAX" },
      { name: "description", content: "Manage your AMYRAX account, orders, and subscription." },
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
  const { user, signOut } = useAuth();
  const [sheet, setSheet] = useState<string | null>(null);
  const orderDate = formatDate(new Date(2023, 8, 26), { year: "numeric", month: "short", day: "numeric" }, i18n.language);
  const displayName =
    (user?.user_metadata?.name as string | undefined) ??
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "Alex R.";

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
            <h2 className="text-xl font-bold text-foreground">{displayName}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{user?.email ?? t("profile.city")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("profile.joined")}</p>
            <DonorBadge userId={user?.id ?? null} />
            <TermsBadge userId={user?.id ?? null} />
          </div>

          <ProfileStats userId={user?.id ?? null} lang={i18n.language} t={t} />
        </div>
      </section>

      {/* Subscription promo (hidden when active) */}
      <section className="mt-6 px-5">
        <SubscribePromoBanner />
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
      <RecentOrders userId={user?.id ?? null} lang={i18n.language} t={t} />

      <ReferralCard userId={user?.id ?? null} />

      {/* Account Navigation */}
      <section className="mt-6 px-5">
        <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-foreground">
          {t("profile.account")}
        </h3>
        <div className="mt-3 rounded-2xl bg-card shadow-sm ring-1 ring-border overflow-hidden">
          {menuItems.map((item, i) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setSheet(item.key)}
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

        <div className="mt-4">
          {user ? (
            <button
              type="button"
              onClick={async () => {
                await signOut();
                toast.success(t("auth.signedOut"));
              }}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-card border border-border py-3 text-sm font-semibold text-destructive shadow-sm hover:bg-accent"
            >
              <LogOut className="h-4 w-4" /> {t("auth.signOut")}
            </button>
          ) : (
            <Link
              to="/auth"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground shadow"
            >
              <LogIn className="h-4 w-4" /> {t("auth.signIn")}
            </Link>
          )}
        </div>
      </section>

      <Sheet open={!!sheet} onOpenChange={(open) => !open && setSheet(null)}>
        <SheetContent side="right" className="w-full sm:max-w-sm p-0">
          <SheetHeader className="px-5 pt-6 pb-3">
            <SheetTitle className="text-lg font-bold capitalize">
              {sheet ? t(`profile.menu.${sheet}`) : ""}
            </SheetTitle>
          </SheetHeader>
          <div className="px-5 pb-8">
            <p className="text-sm text-muted-foreground">{t("common.comingSoon")}</p>
          </div>
        </SheetContent>
      </Sheet>


    </main>
  );
}

function DonorBadge({ userId }: { userId: string | null }) {
  const fetchTier = useServerFn(getMyDonationTier);
  const { data } = useQuery({
    queryKey: ["profile-donation-tier", userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await fetchTier();
      return (res.tier as DonationTier | null) ?? null;
    },
  });
  if (!data) return null;
  return (
    <div className="mt-3 flex justify-center">
      <TierBadge tier={data} size="md" />
    </div>
  );
}

function TermsBadge({ userId }: { userId: string | null }) {
  const { data } = useQuery({
    queryKey: ["profile-terms", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("terms_accepted, terms_accepted_at")
        .eq("id", userId!)
        .maybeSingle();
      if (error) return null;
      return data;
    },
  });
  if (!data?.terms_accepted) return null;
  const when = data.terms_accepted_at ? new Date(data.terms_accepted_at).toLocaleDateString() : null;
  return (
    <div className="mt-3 flex justify-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
        <ShieldCheck className="h-4 w-4" />
        <span>Cuenta verificada · Términos aceptados{when ? ` el ${when}` : ""}</span>
      </div>
    </div>
  );
}

function ProfileStats({ userId, lang, t }: { userId: string | null; lang: string; t: (k: string) => string }) {
  const { data } = useQuery({
    queryKey: ["profile-stats", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [ordersRes, favsRes] = await Promise.all([
        supabase
          .from("star_purchases")
          .select("id", { count: "exact", head: true })
          .eq("subject_user_id", userId!)
          .in("status", ["paid", "completed", "succeeded"]),
        supabase
          .from("reel_likes")
          .select("reel_id", { count: "exact", head: true })
          .eq("user_id", userId!),
      ]);
      return {
        orders: ordersRes.count ?? 0,
        favorites: favsRes.count ?? 0,
      };
    },
  });

  const orders = data?.orders ?? 0;
  const favorites = data?.favorites ?? 0;

  // Cookie fan tier derived from real activity
  const totalActivity = orders * 3 + favorites;
  let level = t("profile.cookieFan");
  if (totalActivity >= 100) level = "Cookie Legend";
  else if (totalActivity >= 50) level = "Cookie Pro";
  else if (totalActivity >= 20) level = "Cookie Fan";
  else if (totalActivity >= 5) level = "Cookie Lover";
  else level = "Cookie Rookie";

  return (
    <div className="mt-5 flex items-center justify-around">
      <div className="flex flex-col items-center px-4">
        <span className="text-lg font-bold text-foreground">{formatNumber(orders, lang)}</span>
        <span className="text-[11px] font-medium text-muted-foreground">{t("profile.orders")}</span>
      </div>
      <div className="h-8 w-px bg-border" />
      <div className="flex flex-col items-center px-4">
        <span className="text-lg font-bold text-foreground">{formatNumber(favorites, lang)}</span>
        <span className="text-[11px] font-medium text-muted-foreground">{t("profile.favorites")}</span>
      </div>
      <div className="h-8 w-px bg-border" />
      <div className="flex flex-col items-center px-4">
        <span className="text-sm font-bold text-foreground">{level}</span>
        <span className="text-[11px] font-medium text-muted-foreground">{t("profile.level")}</span>
      </div>
    </div>
  );
}
