import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Search, Bell } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { BottomNav } from "@/components/BottomNav";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ReelPlayer } from "@/components/ReelPlayer";
import { NotificationsSheet } from "@/components/NotificationsSheet";
import { formatPrice } from "@/i18n";
import { useCart } from "@/lib/cart";
import imgPack6 from "@/assets/pack-6.jpg";
import imgPack9 from "@/assets/pack-9.jpg";
import imgPack12 from "@/assets/pack-12.jpg";
import reel1 from "@/assets/reel-1.jpg";
import reel2 from "@/assets/reel-2.jpg";
import reel3 from "@/assets/reel-3.jpg";
import reelVideo1 from "@/assets/reel-cookie-1.mp4.asset.json";
import reelVideo2 from "@/assets/reel-cookie-2.mp4.asset.json";
import reelVideo3 from "@/assets/reel-cookie-3.mp4.asset.json";
import avatar from "@/assets/avatar.jpg";
import imgChocChunk from "@/assets/ins-chocolate-chunk.jpg";
import imgCookiesCream from "@/assets/ins-cookies-cream.jpg";
import imgSnicker from "@/assets/ins-snickerdoodle.jpg";
import imgSugar from "@/assets/ins-sugar.jpg";
import imgDoubleChoc from "@/assets/ins-double-choc.jpg";
import imgOatmeal from "@/assets/ins-oatmeal.jpg";
import imgWhiteMac from "@/assets/ins-white-mac.jpg";
import imgMM from "@/assets/ins-mm.jpg";
import imgPB from "@/assets/ins-pb.jpg";
import imgMint from "@/assets/ins-mint.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Oys — Gourmet Cookies, Delivered Monthly" },
      { name: "description", content: "Discover artisanal gourmet cookies and join the Oys monthly subscription for freshly baked treats at your door." },
      { property: "og:title", content: "Oys — Gourmet Cookies" },
      { property: "og:description", content: "Discover gourmet cookies & monthly subscriptions with Oys." },
    ],
  }),
  component: Home,
});

const reels = [
  { key: "reel1", img: reel1, src: reelVideo1.url },
  { key: "reel2", img: reel2, src: reelVideo2.url },
  { key: "reel3", img: reel3, src: reelVideo3.url },
];

const trending = [
  { img: imgChocChunk, key: "c1" },
  { img: imgCookiesCream, key: "c2" },
  { img: imgSnicker, key: "c2" },
  { img: imgSugar, key: "c3" },
  { img: imgDoubleChoc, key: "c4" },
  { img: imgOatmeal, key: "c5" },
  { img: imgWhiteMac, key: "c6" },
  { img: imgMM, key: "c7" },
  { img: imgPB, key: "c8" },
  { img: imgMint, key: "c10" },
];

const categoryKeys = ["cookies", "brownies", "boxes", "vegan", "gifts"] as const;
const packIds = ["p6", "p9", "p12"] as const;
const packImages: Record<(typeof packIds)[number], string> = { p6: imgPack6, p9: imgPack9, p12: imgPack12 };
const packPrices: Record<(typeof packIds)[number], number> = { p6: 20, p9: 28, p12: 36 };

function Home() {
  const { t, i18n } = useTranslation();
  const cart = useCart();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);

  const reelRowsQ = useQuery({
    queryKey: ["reels-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reels").select("id, slug");
      if (error) throw error;
      const map = new Map<string, string>();
      data?.forEach((r) => map.set(r.slug, r.id));
      return map;
    },
  });

  const trendingProducts = trending.map((tItem, idx) => ({
    item: tItem,
    productId: `home-${tItem.key}-${idx}`,
    name: t(`cookies.${tItem.key}.name`),
  }));

  return (
    <main className="min-h-screen bg-background pb-24">
      {/* Header banner */}
      <header className="bg-primary text-primary-foreground rounded-b-[2rem] px-5 pt-3 pb-2 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary-foreground/60">{t("home.welcome")}</p>
            <h1 className="text-lg font-bold tracking-tight">{t("home.greeting", { name: "Alex" })}</h1>
            <p className="text-xs text-primary-foreground/70">{t("home.freshToday")}</p>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={() => setNotifOpen(true)}
              className="relative grid h-8 w-8 place-items-center rounded-full bg-primary-foreground/10 backdrop-blur"
              aria-label={t("common.notifications")}
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-cta" />
            </button>
            <Link to="/profile" className="h-9 w-9 overflow-hidden rounded-full ring-2 ring-primary-foreground/30">
              <img src={avatar} alt="Alex" className="h-full w-full object-cover" loading="lazy" />
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="mt-2">
          <div className="flex items-center gap-3 rounded-full bg-background px-4 py-2 shadow-md">
            <Search className="h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("home.searchPlaceholder")}
              aria-label={t("common.search")}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>
      </header>

      {/* Reels */}
      <section className="mt-3">
        <div className="flex items-center justify-between px-5">
          <h2 className="text-lg font-bold text-foreground">{t("home.reels")}</h2>
          <Link to="/explore" className="text-xs font-semibold text-cta">{t("common.seeAll")}</Link>
        </div>
        <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-5 pb-2">
          {reels.map((r) => (
            <ReelPlayer
              key={r.key}
              poster={r.img}
              src={r.src}
              title={t(`reels.${r.key}`)}
              likes={r.likes}
            />
          ))}
        </div>
      </section>

      {/* Trending */}
      <section className="mt-3">
        <div className="flex items-center justify-between px-5">
          <h2 className="text-lg font-bold text-foreground">{t("home.trending")}</h2>
          <Link to="/menu" className="text-xs font-semibold text-cta">{t("common.viewMore")}</Link>
        </div>
        <div className="no-scrollbar mt-3 flex gap-4 overflow-x-auto px-5 pb-2">
          {trendingProducts.map(({ item, productId, name }) => (
            <article
              key={productId}
              className="w-44 shrink-0 overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border"
            >
              <Link to="/menu" className="block aspect-square overflow-hidden bg-cream">
                <img src={item.img} alt={name} className="h-full w-full object-cover transition hover:scale-105" loading="lazy" />
              </Link>
              <div className="p-3">
                <h3 className="text-sm font-semibold text-foreground">{name}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{t(`cookies.${item.key}.caption`)}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-primary">{formatPrice(3.75, i18n.language)}</span>
                  <button
                    type="button"
                    onClick={() => cart.add({ id: productId, name, price: 3.75, image: item.img })}
                    aria-label={`${t("common.add")} ${name}`}
                    className="rounded-full bg-cta px-3 py-1 text-[11px] font-semibold text-cta-foreground active:scale-95 transition"
                  >
                    {t("common.add")}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mt-3">
        <div className="flex items-center justify-between px-5">
          <h2 className="text-lg font-bold text-foreground">{t("home.categories")}</h2>
        </div>
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-5 pb-2">
          {categoryKeys.map((c, i) => (
            <button
              key={c}
              type="button"
              onClick={() => navigate({ to: "/menu" })}
              className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                i === 0
                  ? "bg-primary text-primary-foreground shadow"
                  : "bg-cream text-[color:var(--brown)] hover:bg-cream/70"
              }`}
            >
              {t(`categories.${c}`)}
            </button>
          ))}
        </div>
      </section>

      {/* Cookie Packs */}
      <section className="mt-3">
        <div className="flex items-center justify-between px-5">
          <h2 className="text-lg font-bold text-foreground">{t("home.cookiePacks")}</h2>
          <Link to="/menu" className="text-xs font-semibold text-cta">{t("common.seeAll")}</Link>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-4 px-5 sm:grid-cols-3">
          {packIds.map((id) => (
            <article key={id} className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border">
              <div className="aspect-[4/3] overflow-hidden bg-cream">
                <img src={packImages[id]} alt={t(`packs.${id}.name`)} className="h-full w-full object-cover" loading="lazy" />
              </div>
              <div className="p-4">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-base font-bold text-foreground">{t(`packs.${id}.name`)}</h3>
                  <span className="text-base font-bold text-primary">{formatPrice(packPrices[id], i18n.language)}</span>
                </div>
                <p className="mt-1.5 text-xs leading-snug text-muted-foreground">{t(`packs.${id}.desc`)}</p>
                <button
                  type="button"
                  onClick={() => cart.add({ id: `pack-${id}`, name: t(`packs.${id}.name`), price: packPrices[id], image: packImages[id] })}
                  className="mt-3 w-full rounded-full bg-cta py-2.5 text-sm font-bold text-cta-foreground shadow active:scale-[0.98] transition"
                >
                  {t("common.addToCart")}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Subscription CTA */}
      <section className="mt-3 px-5">
        <div className="relative overflow-hidden rounded-3xl bg-primary p-5 text-primary-foreground shadow-lg">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-cta/30 blur-2xl" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cta">{t("home.subscriptionEyebrow")}</p>
          <h3 className="mt-2 text-xl font-bold leading-tight">{t("home.subscriptionHeadline")}</h3>
          <p className="mt-1 text-sm text-primary-foreground/70">{t("home.subscriptionSubcopy")}</p>
          <Link
            to="/subscribe"
            className="mt-4 inline-block rounded-full bg-cta px-5 py-2.5 text-sm font-bold text-cta-foreground shadow-md active:scale-95 transition"
          >
            {t("home.startSubscription")}
          </Link>
        </div>
      </section>

      {cart.count > 0 && (
        <div className="fixed inset-x-0 bottom-20 z-40 flex justify-center px-4">
          <Link
            to="/cart"
            className="flex items-center gap-3 rounded-full bg-primary px-6 py-3 text-primary-foreground shadow-2xl active:scale-95 transition"
          >
            <span className="text-sm font-bold">{t("common.viewCart")} • {cart.count}</span>
            <span className="text-sm font-bold opacity-80">{formatPrice(cart.total, i18n.language)}</span>
          </Link>
        </div>
      )}

      <NotificationsSheet open={notifOpen} onOpenChange={setNotifOpen} />
      <BottomNav />
    </main>
  );
}
