import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { ReelPlayer } from "@/components/ReelPlayer";
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
  { key: "reel4", img: reel2, src: reelVideo2.url },
  { key: "reel5", img: reel1, src: reelVideo3.url },
  { key: "reel6", img: reel3, src: reelVideo1.url },
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
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 md:px-6">
      {/* Hero banner */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-[#2a1810] to-[#3d2418] p-6 text-white shadow md:p-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300">
          {t("home.subscriptionEyebrow")}
        </p>
        <h1 className="mt-2 text-2xl font-extrabold leading-tight md:text-4xl">
          {t("home.subscriptionHeadline")}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-white/80">
          {t("home.subscriptionSubcopy")}
        </p>
        <Link
          to="/subscribe"
          className="mt-4 inline-block rounded-full bg-amber-400 px-6 py-2.5 text-sm font-bold text-[#1a0f0a] shadow transition hover:bg-amber-300"
        >
          {t("home.startSubscription")}
        </Link>
      </section>

      {/* Reels */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground md:text-xl">{t("home.reels")}</h2>
          <Link to="/explore" className="text-xs font-semibold text-amber-700 hover:underline">
            {t("common.seeAll")}
          </Link>
        </div>
        <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-2">
          {reels.map((r) => {
            const reelId = reelRowsQ.data?.get(r.key);
            if (!reelId) return null;
            return (
              <ReelPlayer
                key={r.key}
                reelId={reelId}
                poster={r.img}
                src={r.src}
                title={t(`reels.${r.key}`)}
              />
            );
          })}
        </div>
      </section>

      {/* Trending */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground md:text-xl">{t("home.trending")}</h2>
          <Link to="/menu" className="text-xs font-semibold text-amber-700 hover:underline">
            {t("common.viewMore")}
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {trendingProducts.slice(0, 10).map(({ item, productId, name }) => (
            <article
              key={productId}
              className="overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-border transition hover:shadow-md"
            >
              <Link to="/menu" className="block aspect-square overflow-hidden bg-cream">
                <img src={item.img} alt={name} className="h-full w-full object-cover transition hover:scale-105" loading="lazy" />
              </Link>
              <div className="p-3">
                <h3 className="line-clamp-1 text-sm font-semibold text-foreground">{name}</h3>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">{formatPrice(3.75, i18n.language)}</span>
                  <button
                    type="button"
                    onClick={() => cart.add({ id: productId, name, price: 3.75, image: item.img })}
                    aria-label={`${t("common.add")} ${name}`}
                    className="rounded-md bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-[#1a0f0a] transition hover:bg-amber-300 active:scale-95"
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
      <section className="mt-6">
        <h2 className="text-lg font-bold text-foreground md:text-xl">{t("home.categories")}</h2>
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-2">
          {categoryKeys.map((c, i) => (
            <button
              key={c}
              type="button"
              onClick={() => navigate({ to: "/menu" })}
              className={`shrink-0 rounded-full px-5 py-2 text-sm font-semibold transition ${
                i === 0
                  ? "bg-[#1a0f0a] text-white shadow"
                  : "bg-white text-foreground ring-1 ring-border hover:bg-amber-50"
              }`}
            >
              {t(`categories.${c}`)}
            </button>
          ))}
        </div>
      </section>

      {/* Cookie Packs */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground md:text-xl">{t("home.cookiePacks")}</h2>
          <Link to="/menu" className="text-xs font-semibold text-amber-700 hover:underline">
            {t("common.seeAll")}
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {packIds.map((id) => (
            <article key={id} className="overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-border">
              <div className="aspect-[4/3] overflow-hidden bg-cream">
                <img src={packImages[id]} alt={t(`packs.${id}.name`)} className="h-full w-full object-cover" loading="lazy" />
              </div>
              <div className="p-4">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-base font-bold text-foreground">{t(`packs.${id}.name`)}</h3>
                  <span className="text-base font-bold text-foreground">{formatPrice(packPrices[id], i18n.language)}</span>
                </div>
                <p className="mt-1.5 text-xs leading-snug text-muted-foreground">{t(`packs.${id}.desc`)}</p>
                <button
                  type="button"
                  onClick={() => cart.add({ id: `pack-${id}`, name: t(`packs.${id}.name`), price: packPrices[id], image: packImages[id] })}
                  className="mt-3 w-full rounded-md bg-amber-400 py-2.5 text-sm font-bold text-[#1a0f0a] shadow transition hover:bg-amber-300 active:scale-[0.98]"
                >
                  {t("common.addToCart")}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
