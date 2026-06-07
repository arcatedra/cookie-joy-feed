import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, ChevronLeft, Star, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BottomNav } from "@/components/BottomNav";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { formatPrice, formatNumber } from "@/i18n";
import { useCart } from "@/lib/cart";
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

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Browse Cookies — Oys" },
      { name: "description", content: "Explore our full range of artisanal gourmet cookies at Oys." },
    ],
  }),
  component: ExplorePage,
});

const products = [
  { id: 1, key: "c1", price: 3.75, rating: 5, reviews: 272, image: imgChocChunk },
  { id: 2, key: "c2", price: 3.75, rating: 5, reviews: 184, image: imgCookiesCream },
  { id: 3, key: "c2", price: 3.75, rating: 5, reviews: 125, image: imgSnicker },
  { id: 4, key: "c3", price: 3.75, rating: 5, reviews: 134, image: imgSugar },
  { id: 5, key: "c4", price: 3.75, rating: 5, reviews: 197, image: imgDoubleChoc },
  { id: 6, key: "c5", price: 3.75, rating: 5, reviews: 98, image: imgOatmeal },
  { id: 7, key: "c6", price: 3.75, rating: 5, reviews: 95, image: imgWhiteMac },
  { id: 8, key: "c7", price: 3.75, rating: 5, reviews: 79, image: imgMM },
  { id: 9, key: "c8", price: 3.75, rating: 5, reviews: 56, image: imgPB },
  { id: 10, key: "c10", price: 3.75, rating: 5, reviews: 23, image: imgMint },
];

function StarRating({ rating, reviews }: { rating: number; reviews: number }) {
  const { i18n } = useTranslation();
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${
              i < rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"
            }`}
          />
        ))}
      </div>
      <span className="text-[10px] text-muted-foreground">({formatNumber(reviews, i18n.language)})</span>
    </div>
  );
}

function ExplorePage() {
  const { t, i18n } = useTranslation();
  return (
    <main className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-5 pt-12 pb-5">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/10"
            aria-label={t("common.back")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-bold uppercase tracking-[0.15em]">
            {t("explore.title")}
          </h1>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Search & Filters */}
      <section className="px-5 pt-5">
        <div className="flex items-center gap-3 rounded-full bg-card px-5 py-3.5 shadow-sm ring-1 ring-border">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder={t("home.searchPlaceholder")}
            aria-label={t("common.search")}
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        <div className="mt-3 flex gap-2">
          <button className="flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-sm">
            {t("explore.sort")} <span className="text-muted-foreground">∨</span>
          </button>
          <button className="flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-sm">
            {t("explore.price")} <span className="text-muted-foreground">∨</span>
          </button>
        </div>
      </section>

      {/* Product Grid */}
      <section className="mt-6 px-5">
        <div className="grid grid-cols-2 gap-4">
          {products.map((p) => {
            const name = t(`cookies.${p.key}.name`);
            return (
              <article
                key={p.id}
                className="relative overflow-hidden rounded-2xl bg-card p-3 shadow-sm ring-1 ring-border"
              >
                <div className="aspect-square overflow-hidden rounded-xl bg-cream">
                  <img
                    src={p.image}
                    alt={name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    width={512}
                    height={512}
                  />
                </div>
                <div className="mt-3">
                  <h3 className="text-sm font-bold text-foreground leading-tight">{name}</h3>
                  <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{t(`cookies.${p.key}.caption`)}</p>
                  <div className="mt-1">
                    <StarRating rating={p.rating} reviews={p.reviews} />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-primary">{formatPrice(p.price, i18n.language)}</span>
                  </div>
                </div>
                <button
                  className="absolute bottom-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-orange text-white shadow-md"
                  aria-label={`${t("common.add")} ${name}`}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
