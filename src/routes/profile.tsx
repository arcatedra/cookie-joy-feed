import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
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
  MessageSquare,
  Inbox,
} from "lucide-react";
import { adminUnreadCount } from "@/lib/suggestions.functions";
import { ReferralHistory } from "@/components/ReferralHistory";
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
import { SubscribePromoBanner, useSubscriptionGate } from "@/lib/subscription-gate";
import avatar from "@/assets/avatar.jpg";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FavoritesList } from "@/components/FavoritesList";
import i18n from "@/i18n";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: i18n.t("profilePage.metaTitle") },
      { name: "description", content: i18n.t("profilePage.metaDesc") },
    ],
  }),
  component: ProfilePage,
});

const menuItems = [
  { key: "favorites", Icon: Heart },
  { key: "payment", Icon: CreditCard },
  { key: "security", Icon: ShieldCheck },
  { key: "general", Icon: SlidersHorizontal },
  { key: "help", Icon: HelpCircle },
] as const;


function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { deliveryStatus } = useSubscriptionGate();
  const [sheet, setSheet] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth", search: { redirect: "/profile" } });
    }
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen grid place-items-center bg-background px-6">
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-bold text-foreground">{t("auth.signIn")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("auth.signInRequired", { defaultValue: "Inicia sesión para ver tu perfil." })}
          </p>
          <Link
            to="/auth"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow"
          >
            <LogIn className="h-4 w-4" /> {t("auth.signIn")}
          </Link>
        </div>
      </main>
    );
  }

  const displayName =
    (user.user_metadata?.name as string | undefined) ??
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    t("profile.title");


  return (
    <main className="profile-page min-h-screen bg-background pb-24">
      {/* Referral QR — visible immediately, no scroll required */}
      <div className="pt-4">
        <ReferralCard userId={user?.id ?? null} />
      </div>

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
            <h2 className="text-xl font-bold text-card-foreground">{displayName}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{user?.email ?? t("profile.city")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("profile.joined")}</p>
            <DonorBadge userId={user?.id ?? null} />
            <TermsBadge userId={user?.id ?? null} />
          </div>

          <ProfileStats userId={user?.id ?? null} lang={i18n.language} t={t} />
        </div>
      </section>

      <ReferralHistory userId={user?.id ?? null} />


      {/* Subscription promo (hidden when active) */}
      <section className="mt-6 px-5">
        <SubscribePromoBanner />
      </section>


      {/* Active Plan — solo si el usuario realmente tiene una suscripción activa */}
      {deliveryStatus.hasActiveSubscription && deliveryStatus.planName ? (
        <section className="mt-6 px-5">
          <Link
            to="/subscribe"
            className="flex items-center justify-between rounded-2xl bg-primary p-4 text-primary-foreground shadow-lg"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary-foreground/10">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-primary-foreground/70">{t("profile.currentPlan")}</p>
                <p className="text-sm font-bold">{deliveryStatus.planName}</p>
                <p className="text-[11px] text-primary-foreground/70">
                  {deliveryStatus.used}/{deliveryStatus.deliveriesPerMonth} {t("profile.deliveriesUsed", { defaultValue: "deliveries used" })}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-bold text-green-400">
              {t("profile.active")}
            </span>
          </Link>
        </section>
      ) : null}

      {/* Recent Orders */}
      <RecentOrders userId={user?.id ?? null} lang={i18n.language} t={t} />


      {/* Account Navigation */}
      <section className="mt-6 px-5">
        <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-foreground">
          {t("profile.account")}
        </h3>
          <div className="mt-3 overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border">
          {menuItems.map((item, i) => {
            const className = `flex w-full items-center justify-between px-4 py-3.5 text-left transition hover:bg-accent ${
              i !== menuItems.length - 1 ? "border-b border-border" : ""
            }`;
            const inner = (
              <>
                <div className="flex items-center gap-3">
                  <item.Icon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-semibold text-card-foreground">{t(`profile.menu.${item.key}`)}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </>
            );
            if (item.key === "help") {
              return (
                <Link key={item.key} to="/support" className={className}>
                  {inner}
                </Link>
              );
            }
            if (item.key === "security") {
              return (
                <Link key={item.key} to="/profile/security" className={className}>
                  {inner}
                </Link>
              );
            }

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setSheet(item.key)}
                className={className}
              >
                {inner}
              </button>
            );
          })}
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

      {/* Suggestions box (user) */}
      <section className="mt-6 px-5">
        <Link
          to="/suggestions"
          className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border hover:bg-accent"
        >
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-card-foreground">Buzón de sugerencias</p>
              <p className="text-xs text-muted-foreground">Danos tu opinión — la lee nuestro equipo</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </section>

      {user?.id ? <AdminSuggestionsLink userId={user.id} /> : null}


      <Sheet open={!!sheet} onOpenChange={(open) => !open && setSheet(null)}>
          <SheetContent side="right" className="w-full bg-card text-card-foreground sm:max-w-sm p-0">
          <SheetHeader className="px-5 pt-6 pb-3">
            <SheetTitle className="text-lg font-bold capitalize">
              {sheet ? t(`profile.menu.${sheet}`) : ""}
            </SheetTitle>
          </SheetHeader>
          <div className="px-5 pb-8">
            {sheet === "favorites" ? (
              <FavoritesList />
            ) : (
              <p className="text-sm text-muted-foreground">{t("common.comingSoon")}</p>
            )}
          </div>
        </SheetContent>
      </Sheet>


    </main>
  );
}

function AdminSuggestionsLink({ userId }: { userId: string }) {
  const fetchUnread = useServerFn(adminUnreadCount);
  const { data } = useQuery({
    queryKey: ["admin-suggestions-unread", userId],
    enabled: !!userId,
    queryFn: async () => {
      try {
        return (await fetchUnread()) as { unreadCount: number };
      } catch {
        return null;
      }
    },
    refetchInterval: 30_000,
  });
  if (!data) return null; // not admin or error → hide silently
  return (
    <section className="mt-3 px-5">
      <Link
        to="/admin/suggestions"
        className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border hover:bg-accent"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
            <Inbox className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-card-foreground">Admin · Buzón de sugerencias</p>
            <p className="text-xs text-muted-foreground">
              {data.unreadCount > 0 ? `${data.unreadCount} sin leer` : "Todo al día"}
            </p>
          </div>
        </div>
        {data.unreadCount > 0 && (
          <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">
            {data.unreadCount}
          </span>
        )}
      </Link>
    </section>
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

function RecentOrders({ userId, lang, t }: { userId: string | null; lang: string; t: (k: string, opts?: Record<string, unknown>) => string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["profile-recent-orders", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("star_purchases")
        .select("id, package_id, tokens, amount_usd, created_at, status")
        .eq("subject_user_id", userId!)
        .in("status", ["paid", "completed", "succeeded"])
        .order("created_at", { ascending: false })
        .limit(3);
      return data ?? [];
    },
  });

  return (
    <section className="mt-6 px-5">
      <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-foreground">
        {t("profile.recentOrders")}
      </h3>
      <div className="mt-3 space-y-2">
        {isLoading ? (
          <div className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
            <p className="text-xs text-muted-foreground">…</p>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border text-center">
            <p className="text-sm text-muted-foreground">Aún no tienes pedidos. ¡Haz tu primera compra para verla aquí!</p>
          </div>
        ) : (
          data.map((order) => {
            const shortId = order.id.slice(0, 6).toUpperCase();
            const date = formatDate(new Date(order.created_at), { year: "numeric", month: "short", day: "numeric" }, lang);
            return (
              <div key={order.id} className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-cream">
                      <Cookie className="h-5 w-5 text-brown" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-card-foreground">{t("profile.order", { id: shortId })}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.tokens} ⭐ · ${Number(order.amount_usd).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{date}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
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
          .from("favorites")
          .select("id", { count: "exact", head: true })
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
        <span className="text-lg font-bold text-card-foreground">{formatNumber(orders, lang)}</span>
        <span className="text-[11px] font-medium text-muted-foreground">{t("profile.orders")}</span>
      </div>
      <div className="h-8 w-px bg-border" />
      <div className="flex flex-col items-center px-4">
        <span className="text-lg font-bold text-card-foreground">{formatNumber(favorites, lang)}</span>
        <span className="text-[11px] font-medium text-muted-foreground">{t("profile.favorites")}</span>
      </div>
      <div className="h-8 w-px bg-border" />
      <div className="flex flex-col items-center px-4">
        <span className="text-sm font-bold text-card-foreground">{level}</span>
        <span className="text-[11px] font-medium text-muted-foreground">{t("profile.level")}</span>
      </div>
    </div>
  );
}
