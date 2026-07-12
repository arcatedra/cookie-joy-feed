import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Filter, Star, ShoppingCart, X } from "lucide-react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useCart } from "@/lib/cart";
import { useSubscriptionGate } from "@/lib/subscription-gate";
import imgChocChunk from "@/assets/ins-chocolate-chunk.jpg";
import imgSnicker from "@/assets/ins-snickerdoodle.jpg";
import imgSugar from "@/assets/ins-sugar.jpg";
import imgDoubleChoc from "@/assets/ins-double-choc.jpg";
import imgOatmeal from "@/assets/ins-oatmeal.jpg";
import imgWhiteMac from "@/assets/ins-white-mac.jpg";
import imgMM from "@/assets/ins-mm.jpg";
import imgPB from "@/assets/ins-pb.jpg";
import imgVeganChoc from "@/assets/ins-vegan-choc.jpg";
import imgMint from "@/assets/ins-mint.jpg";
import imgPack6 from "@/assets/pack-6.jpg";
import imgPack9 from "@/assets/pack-9.jpg";
import imgPack12 from "@/assets/pack-12.jpg";
import i18n from "@/i18n";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/search")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: i18n.t("searchPage.metaTitle") },
      { name: "description", content: i18n.t("searchPage.metaDesc") },
    ],
  }),
  component: SearchPage,
});

type Category = "traditional" | "filled" | "healthy" | "gift";
type Allergen = "glutenFree" | "noSugar" | "nuts" | "belgian";

interface Product {
  id: string;
  name: string;
  image: string;
  price: number;
  rating: number;
  reviews: number;
  category: Category;
  allergens: Allergen[];
  badge?: "bestSeller" | "deal";
  expressShipping: boolean;
  deliveryDate: string;
}

const PRODUCTS: Product[] = [
  { id: "p1", name: "Chocolate Chunk", image: imgChocChunk, price: 4.5, rating: 4.8, reviews: 2310, category: "traditional", allergens: ["belgian"], badge: "bestSeller", expressShipping: true, deliveryDate: "Tomorrow, Jun 9" },
  { id: "p2", name: "Snickerdoodle", image: imgSnicker, price: 3.9, rating: 4.6, reviews: 1208, category: "traditional", allergens: [], expressShipping: true, deliveryDate: "Tomorrow, Jun 9" },
  { id: "p3", name: "Sugar Cookie", image: imgSugar, price: 3.2, rating: 4.3, reviews: 890, category: "traditional", allergens: [], expressShipping: false, deliveryDate: "Wed, Jun 11" },
  { id: "p4", name: "Double Choc Mint", image: imgDoubleChoc, price: 5.2, rating: 4.9, reviews: 3104, category: "filled", allergens: ["belgian"], badge: "deal", expressShipping: true, deliveryDate: "Tomorrow, Jun 9" },
  { id: "p5", name: "Oatmeal Raisin", image: imgOatmeal, price: 3.5, rating: 4.2, reviews: 612, category: "healthy", allergens: ["noSugar"], expressShipping: false, deliveryDate: "Wed, Jun 11" },
  { id: "p6", name: "White Macadamia", image: imgWhiteMac, price: 4.8, rating: 4.5, reviews: 980, category: "traditional", allergens: ["nuts"], expressShipping: true, deliveryDate: "Tomorrow, Jun 9" },
  { id: "p7", name: "M&M Cookie", image: imgMM, price: 4.1, rating: 4.7, reviews: 1740, category: "filled", allergens: [], badge: "bestSeller", expressShipping: true, deliveryDate: "Tomorrow, Jun 9" },
  { id: "p8", name: "Peanut Butter", image: imgPB, price: 3.8, rating: 4.4, reviews: 720, category: "traditional", allergens: ["nuts"], expressShipping: false, deliveryDate: "Wed, Jun 11" },
  { id: "p9", name: "Vegan Choc", image: imgVeganChoc, price: 5.5, rating: 4.6, reviews: 450, category: "healthy", allergens: ["glutenFree", "noSugar"], badge: "deal", expressShipping: true, deliveryDate: "Tomorrow, Jun 9" },
  { id: "p10", name: "Mint Crunch", image: imgMint, price: 4.3, rating: 4.5, reviews: 540, category: "filled", allergens: ["belgian"], expressShipping: false, deliveryDate: "Wed, Jun 11" },
  { id: "p11", name: "Pack of 6", image: imgPack6, price: 22, rating: 4.8, reviews: 1320, category: "gift", allergens: [], badge: "bestSeller", expressShipping: true, deliveryDate: "Tomorrow, Jun 9" },
  { id: "p12", name: "Pack of 9", image: imgPack9, price: 32, rating: 4.9, reviews: 980, category: "gift", allergens: [], expressShipping: true, deliveryDate: "Tomorrow, Jun 9" },
  { id: "p13", name: "Pack of 12", image: imgPack12, price: 42, rating: 4.9, reviews: 1620, category: "gift", allergens: ["belgian"], badge: "deal", expressShipping: false, deliveryDate: "Wed, Jun 11" },
];

const CAT_KEYS: ("all" | Category)[] = ["all", "traditional", "filled", "healthy", "gift"];
const ALLERGEN_KEYS: Allergen[] = ["glutenFree", "noSugar", "nuts", "belgian"];

const PRICE_RANGES: { key: string; min: number; max: number }[] = [
  { key: "u10", min: 0, max: 10 },
  { key: "1025", min: 10, max: 25 },
  { key: "o25", min: 25, max: 9999 },
];

type SortKey = "featured" | "priceAsc" | "priceDesc" | "rating";

function Stars({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${cls} ${n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`}
        />
      ))}
    </div>
  );
}

function FiltersPanel({
  cat, setCat, minRating, setMinRating, allergens, toggleAllergen,
  priceRange, setPriceRange, customMin, setCustomMin, customMax, setCustomMax,
  express, setExpress, applyCustom,
}: {
  cat: "all" | Category; setCat: (c: "all" | Category) => void;
  minRating: number; setMinRating: (n: number) => void;
  allergens: Allergen[]; toggleAllergen: (a: Allergen) => void;
  priceRange: string | null; setPriceRange: (k: string | null) => void;
  customMin: string; setCustomMin: (v: string) => void;
  customMax: string; setCustomMax: (v: string) => void;
  express: boolean; setExpress: (b: boolean) => void;
  applyCustom: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6 text-sm">
      <section>
        <h3 className="mb-2 font-bold text-[#1a0f0a]">{t("searchPage.category")}</h3>
        <ul className="space-y-1.5">
          {CAT_KEYS.map((c) => (
            <li key={c}>
              <button
                type="button"
                onClick={() => setCat(c)}
                className={`text-left transition hover:text-amber-700 hover:underline ${cat === c ? "font-bold text-amber-700" : "text-foreground"}`}
              >
                {t(`searchPage.cats.${c}`)}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 font-bold text-[#1a0f0a]">{t("searchPage.customerReviews")}</h3>
        <ul className="space-y-1.5">
          {[4, 3, 2, 1].map((n) => (
            <li key={n}>
              <button
                type="button"
                onClick={() => setMinRating(minRating === n ? 0 : n)}
                className={`flex items-center gap-1.5 transition hover:underline ${minRating === n ? "font-semibold" : ""}`}
              >
                <Stars value={n} />
                <span className="text-xs text-muted-foreground">{t("searchPage.andUp")}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 font-bold text-[#1a0f0a]">{t("searchPage.ingredientsAllergens")}</h3>
        <ul className="space-y-1.5">
          {ALLERGEN_KEYS.map((a) => (
            <li key={a}>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={allergens.includes(a)}
                  onChange={() => toggleAllergen(a)}
                  className="h-4 w-4 accent-amber-600"
                />
                <span>{t(`searchPage.allergens.${a}`)}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 font-bold text-[#1a0f0a]">{t("searchPage.price")}</h3>
        <ul className="space-y-1.5">
          {PRICE_RANGES.map((p) => (
            <li key={p.key}>
              <button
                type="button"
                onClick={() => setPriceRange(priceRange === p.key ? null : p.key)}
                className={`text-left transition hover:text-amber-700 hover:underline ${priceRange === p.key ? "font-bold text-amber-700" : ""}`}
              >
                {t(`searchPage.prices.${p.key}`)}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center gap-1.5">
          <span className="text-xs">$</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder={t("searchPage.min")}
            value={customMin}
            onChange={(e) => setCustomMin(e.target.value)}
            className="w-16 rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
          <span className="text-xs">$</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder={t("searchPage.max")}
            value={customMax}
            onChange={(e) => setCustomMax(e.target.value)}
            className="w-16 rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
          <button
            type="button"
            onClick={applyCustom}
            className="rounded border border-input bg-muted px-3 py-1 text-xs font-semibold hover:bg-muted/70"
          >
            {t("searchPage.go")}
          </button>
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-bold text-[#1a0f0a]">{t("searchPage.shipping")}</h3>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={express}
            onChange={(e) => setExpress(e.target.checked)}
            className="h-4 w-4 accent-amber-600"
          />
          <span>{t("searchPage.expressToday")}</span>
        </label>
      </section>
    </div>
  );
}

function SearchPage() {
  const { t } = useTranslation();
  const cart = useCart();
  const gate = useSubscriptionGate();
  const [cat, setCat] = useState<"all" | Category>("all");
  const [minRating, setMinRating] = useState(0);
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [priceRange, setPriceRange] = useState<string | null>(null);
  const [customMin, setCustomMin] = useState("");
  const [customMax, setCustomMax] = useState("");
  const [customApplied, setCustomApplied] = useState<{ min: number; max: number } | null>(null);
  const [express, setExpress] = useState(false);
  const [sort, setSort] = useState<SortKey>("featured");
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleAllergen = (a: Allergen) =>
    setAllergens((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  const applyCustom = () => {
    const mn = Number(customMin) || 0;
    const mx = Number(customMax) || 9999;
    setCustomApplied({ min: mn, max: mx });
    setPriceRange(null);
  };

  const filtered = useMemo(() => {
    let list = PRODUCTS.slice();
    if (cat !== "all") list = list.filter((p) => p.category === cat);
    if (minRating > 0) list = list.filter((p) => p.rating >= minRating);
    if (allergens.length) list = list.filter((p) => allergens.every((a) => p.allergens.includes(a)));
    if (priceRange) {
      const r = PRICE_RANGES.find((p) => p.key === priceRange)!;
      list = list.filter((p) => p.price >= r.min && p.price <= r.max);
    } else if (customApplied) {
      list = list.filter((p) => p.price >= customApplied.min && p.price <= customApplied.max);
    }
    if (express) list = list.filter((p) => p.expressShipping);
    switch (sort) {
      case "priceAsc": list.sort((a, b) => a.price - b.price); break;
      case "priceDesc": list.sort((a, b) => b.price - a.price); break;
      case "rating": list.sort((a, b) => b.rating - a.rating); break;
    }
    return list;
  }, [cat, minRating, allergens, priceRange, customApplied, express, sort]);

  const filterProps = {
    cat, setCat, minRating, setMinRating, allergens, toggleAllergen,
    priceRange, setPriceRange, customMin, setCustomMin, customMax, setCustomMax,
    express, setExpress, applyCustom,
  };

  return (
    <div className="mx-auto max-w-[1500px] px-3 py-4 md:px-6">
      <div className="flex gap-6">
        <aside className="hidden w-64 shrink-0 rounded-md border border-border bg-white p-4 md:block lg:w-72">
          <FiltersPanel {...filterProps} />
        </aside>

        <section className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm">
            <p className="text-foreground">
              <span className="font-semibold">1-{filtered.length}</span>
              {t("searchPage.resultsCountPre")}
              <span className="font-semibold">{PRODUCTS.length}</span>
              {t("searchPage.resultsCountPost")}
            </p>
            <label className="flex items-center gap-2">
              <span className="text-xs font-semibold">{t("searchPage.sortBy")}</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded border border-input bg-background px-2 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-400"
              >
                <option value="featured">{t("searchPage.sort.featured")}</option>
                <option value="priceAsc">{t("searchPage.sort.priceAsc")}</option>
                <option value="priceDesc">{t("searchPage.sort.priceDesc")}</option>
                <option value="rating">{t("searchPage.sort.rating")}</option>
              </select>
            </label>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-md border border-border bg-white p-10 text-center text-muted-foreground">
              {t("searchPage.noMatches")}
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => (
                <li key={p.id} className="group flex flex-col overflow-hidden rounded-md border border-border bg-white transition hover:shadow-md">
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    {p.badge && (
                      <span className={`absolute left-2 top-2 z-10 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${p.badge === "bestSeller" ? "bg-amber-600" : "bg-red-600"}`}>
                        {p.badge === "bestSeller" ? t("searchPage.bestSeller") : t("searchPage.deal")}
                      </span>
                    )}
                    <img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5 p-3">
                    <Link
                      to="/menu"
                      className="line-clamp-2 text-sm font-semibold text-[#1a0f0a] hover:text-amber-700 hover:underline"
                    >
                      {p.name}
                    </Link>
                    <div className="flex items-center gap-1.5">
                      <Stars value={p.rating} />
                      <span className="text-xs text-muted-foreground">({p.reviews.toLocaleString()})</span>
                    </div>
                    <div className="text-xl font-bold text-[#1a0f0a]">
                      <span className="text-xs align-top">$</span>
                      {p.price.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{t("searchPage.getItOn", { date: p.deliveryDate })}</span>
                    </p>
                    {p.expressShipping && (
                      <p className="text-[11px] font-semibold text-emerald-700">{t("searchPage.expressAvailable")}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => gate.guard(() => cart.add({ id: p.id, name: p.name, price: p.price, image: p.image }))}
                      className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-full bg-amber-400 px-3 py-2 text-xs font-bold text-[#1a0f0a] shadow-sm transition hover:bg-amber-300"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      {t("searchPage.addToCart")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-[#1a0f0a] px-5 py-3 text-sm font-bold text-white shadow-lg md:hidden"
      >
        <Filter className="h-4 w-4" />
        {t("searchPage.filters")}
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{t("searchPage.filters")}</h2>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted"
                aria-label={t("searchPage.closeFilters")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <FiltersPanel {...filterProps} />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="mt-5 w-full rounded-full bg-amber-400 py-3 text-sm font-bold text-[#1a0f0a]"
            >
              {t("searchPage.showResults", { n: filtered.length })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
