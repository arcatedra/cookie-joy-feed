import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Heart, MessageCircle, Play, Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BottomNav } from "@/components/BottomNav";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { formatPrice } from "@/i18n";
import imgPack6 from "@/assets/pack-6.jpg";
import imgPack9 from "@/assets/pack-9.jpg";
import imgPack12 from "@/assets/pack-12.jpg";
import reel1 from "@/assets/reel-1.jpg";
import reel2 from "@/assets/reel-2.jpg";
import reel3 from "@/assets/reel-3.jpg";
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
  { img: reel1, key: "reel1", likes: "12.4k" },
  { img: reel2, key: "reel2", likes: "8.1k" },
  { img: reel3, key: "reel3", likes: "5.7k" },
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

  return (
    <main className="min-h-screen bg-background pb-24">
      {/* Header banner */}
      <header className="bg-primary text-primary-foreground rounded-b-[2rem] px-5 pt-5 pb-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/60">{t("home.welcome")}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{t("home.greeting", { name: "Alex" })}</h1>
            <p className="mt-1 text-sm text-primary-foreground/70">{t("home.freshToday")}</p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <button className="relative grid h-10 w-10 place-items-center rounded-full bg-primary-foreground/10 backdrop-blur" aria-label={t("nav.profile")}>
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-cta" />
            </button>
            <div className="h-12 w-12 overflow-hidden rounded-full ring-2 ring-primary-foreground/30">
              <img src={avatar} alt="Alex" className="h-full w-full object-cover" loading="lazy" />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mt-3">
          <div className="flex items-center gap-3 rounded-full bg-background px-5 py-3.5 shadow-md">
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
          <button className="text-xs font-semibold text-cta">{t("common.seeAll")}</button>
        </div>
        <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto px-5 pb-2">
          {reels.map((r) => (
            <article
              key={r.key}
              className="relative h-56 w-36 shrink-0 overflow-hidden rounded-2xl shadow-md"
            >
              <img src={r.img} alt={t(`reels.${r.key}`)} className="h-full w-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />
              <button className="absolute top-1/2 left-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow-lg backdrop-blur" aria-label={t(`reels.${r.key}`)}>
                <Play className="h-5 w-5 fill-primary text-primary" />
              </button>
              <div className="absolute top-2 right-2 flex flex-col gap-2">
                <div className="flex flex-col items-center gap-0.5 rounded-full bg-black/30 px-1.5 py-1 backdrop-blur">
                  <Heart className="h-3.5 w-3.5 text-white" />
                  <span className="text-[9px] font-semibold text-white">{r.likes}</span>
                </div>
                <div className="flex flex-col items-center gap-0.5 rounded-full bg-black/30 px-1.5 py-1 backdrop-blur">
                  <MessageCircle className="h-3.5 w-3.5 text-white" />
                  <span className="text-[9px] font-semibold text-white">128</span>
                </div>
              </div>
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-xs font-bold leading-tight text-white drop-shadow">{t(`reels.${r.key}`)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Trending */}
      <section className="mt-3">
        <div className="flex items-center justify-between px-5">
          <h2 className="text-lg font-bold text-foreground">{t("home.trending")}</h2>
          <button className="text-xs font-semibold text-cta">{t("common.viewMore")}</button>
        </div>
        <div className="no-scrollbar mt-3 flex gap-4 overflow-x-auto px-5 pb-2">
          {trending.map((tItem, idx) => (
            <article
              key={`${tItem.key}-${idx}`}
              className="w-44 shrink-0 overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border"
            >
              <div className="aspect-square overflow-hidden bg-cream">
                <img src={tItem.img} alt={t(`cookies.${tItem.key}.name`)} className="h-full w-full object-cover" loading="lazy" />
              </div>
              <div className="p-3">
                <h3 className="text-sm font-semibold text-foreground">{t(`cookies.${tItem.key}.name`)}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{t(`cookies.${tItem.key}.caption`)}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-primary">{formatPrice(3.75, i18n.language)}</span>
                  <button className="rounded-full bg-cta px-3 py-1 text-[11px] font-semibold text-cta-foreground">
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
                <button className="mt-3 w-full rounded-full bg-cta py-2.5 text-sm font-bold text-cta-foreground shadow">
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
          <button className="mt-4 rounded-full bg-cta px-5 py-2.5 text-sm font-bold text-cta-foreground shadow-md">
            {t("home.startSubscription")}
          </button>
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
