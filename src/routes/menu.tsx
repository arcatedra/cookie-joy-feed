import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, Minus, Search, ThumbsUp, ShoppingCart, Menu as MenuIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { BottomNav } from "@/components/BottomNav";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { formatPrice, formatNumber } from "@/i18n";
import { useCart } from "@/lib/cart";
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

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "Menu — Oys" },
      { name: "description", content: "Browse our classic cookies." },
    ],
  }),
  component: MenuPage,
});

interface MenuItem {
  id: string;
  tKey: string;
  price: number;
  rating: number;
  reviews: number;
  image: string;
  badge?: "V" | "GF";
  tag?: "treeNuts" | "peanuts";
}

const cookies: MenuItem[] = [
  { id: "c1", tKey: "c1", price: 3.75, rating: 89, reviews: 272, image: imgChocChunk },
  { id: "c2", tKey: "c2", price: 3.75, rating: 91, reviews: 125, image: imgSnicker },
  { id: "c3", tKey: "c3", price: 3.75, rating: 85, reviews: 134, image: imgSugar },
  { id: "c4", tKey: "c4", price: 3.75, rating: 87, reviews: 197, image: imgDoubleChoc },
  { id: "c5", tKey: "c5", price: 3.75, rating: 88, reviews: 98, image: imgOatmeal },
  { id: "c6", tKey: "c6", price: 3.75, rating: 81, reviews: 95, image: imgWhiteMac, tag: "treeNuts" },
  { id: "c7", tKey: "c7", price: 3.75, rating: 82, reviews: 79, image: imgMM },
  { id: "c8", tKey: "c8", price: 3.75, rating: 83, reviews: 56, image: imgPB, tag: "peanuts" },
  { id: "c9", tKey: "c9", price: 3.75, rating: 83, reviews: 37, image: imgVeganChoc, badge: "V" },
  { id: "c10", tKey: "c10", price: 3.75, rating: 95, reviews: 23, image: imgMint, badge: "V" },
];

interface PackItem {
  id: "p6" | "p9" | "p12";
  price: number;
  image: string;
  cookieCount: number;
  caloriesPerCookie: number;
}

const packs: PackItem[] = [
  { id: "p6", price: 20.0, image: imgPack6, cookieCount: 6, caloriesPerCookie: 220 },
  { id: "p9", price: 28.0, image: imgPack9, cookieCount: 9, caloriesPerCookie: 220 },
  { id: "p12", price: 36.0, image: imgPack12, cookieCount: 12, caloriesPerCookie: 220 },
];

const tabKeys = ["classic", "packs", "deluxe"] as const;
type TabKey = (typeof tabKeys)[number];

function useSnapCarousel(itemCount: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollTo = useCallback((index: number) => {
    const el = ref.current;
    if (!el) return;
    const scrollWidth = el.scrollWidth;
    const itemWidth = scrollWidth / itemCount;
    el.scrollTo({ left: itemWidth * index, behavior: "smooth" });
  }, [itemCount]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleScroll = () => {
      const scrollWidth = el.scrollWidth - el.clientWidth;
      if (scrollWidth <= 0) return;
      const progress = el.scrollLeft / scrollWidth;
      const idx = Math.min(itemCount - 1, Math.max(0, Math.round(progress * (itemCount - 1))));
      setActiveIndex(idx);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [itemCount]);

  return { ref, activeIndex, scrollTo };
}

function MenuPage() {
  const { t, i18n } = useTranslation();
  const globalCart = useCart();
  const [activeTab, setActiveTab] = useState<TabKey>("classic");
  const [selectedCookie, setSelectedCookie] = useState<MenuItem | null>(null);
  const [selectedPack, setSelectedPack] = useState<PackItem | null>(null);

  const { ref: packsRef, activeIndex: packIndex, scrollTo: scrollToPack } = useSnapCarousel(packs.length);

  const qtyOf = (id: string) => globalCart.items.find((it) => it.id === id)?.qty ?? 0;
  const cartCount = globalCart.count;
  const cartTotal = globalCart.total;

  const add = (id: string) => {
    const cookie = cookies.find((c) => c.id === id);
    if (cookie) {
      globalCart.add({ id: cookie.id, name: t(`cookies.${cookie.tKey}.name`), price: cookie.price, image: cookie.image });
      return;
    }
    const pack = packs.find((p) => p.id === id);
    if (pack) {
      globalCart.add({ id: pack.id, name: t(`packs.${pack.id}.name`), price: pack.price, image: pack.image });
    }
  };
  const sub = (id: string) => globalCart.setQty(id, qtyOf(id) - 1);

  const detailQty = selectedCookie ? qtyOf(selectedCookie.id) : 0;

  return (
    <main className="min-h-screen bg-white pb-32 font-sans text-black">
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <Link to="/" aria-label={t("common.back")} className="grid h-10 w-10 place-items-center">
          <ChevronLeft className="h-6 w-6 text-black" strokeWidth={2.5} />
        </Link>
        <h1 className="text-[19px] font-bold text-black">{t("menu.title")}</h1>
        <div className="flex items-center gap-2">
          <LanguageSwitcher variant="light" />
          <button aria-label={t("common.search")} className="grid h-10 w-10 place-items-center">
            <Search className="h-5 w-5 text-black" strokeWidth={2.5} />
          </button>
        </div>
      </header>

      <nav className="flex items-center gap-6 border-b border-gray-200 px-4">
        <button aria-label={t("menu.allCategories")} className="pb-3 pt-1">
          <MenuIcon className="h-5 w-5 text-black" strokeWidth={2.5} />
        </button>
        {tabKeys.map((k) => {
          const active = k === activeTab;
          return (
            <button
              key={k}
              onClick={() => setActiveTab(k)}
              className={`relative whitespace-nowrap pb-3 pt-1 text-[15px] ${active ? "font-bold text-black" : "font-medium text-gray-400"}`}
            >
              {t(`menu.tabs.${k}`)}
              {active && <span className="absolute -bottom-px left-0 right-0 h-[3px] bg-black" />}
            </button>
          );
        })}
      </nav>

      {activeTab === "classic" && (
        <section className="grid grid-cols-2 gap-x-3 gap-y-6 px-4 pt-5">
          {cookies.map((item) => {
            const qty = qtyOf(item.id);
            const name = t(`cookies.${item.tKey}.name`);
            return (
              <article key={item.id} className="flex flex-col">
                <div className="relative aspect-square overflow-hidden rounded-xl bg-[#f6f6f6]">
                  <button
                    type="button"
                    aria-label={t("menu.viewDetails", { name })}
                    onClick={() => setSelectedCookie(item)}
                    className="absolute inset-0 cursor-pointer text-left"
                  >
                    <img
                      src={item.image}
                      alt={name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      width={1024}
                      height={1024}
                    />
                    {item.badge && (
                      <span className="absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-[#0a8a3a] text-xs font-extrabold text-white">
                        {item.badge}
                      </span>
                    )}
                    {item.tag && (
                      <span className="absolute right-2 top-2 rounded-full bg-[#6b2c91] px-2 py-1 text-[9px] font-extrabold tracking-wide text-white">
                        {t(`tags.${item.tag}`)}
                      </span>
                    )}
                  </button>
                  {qty === 0 ? (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); add(item.id); }}
                      aria-label={`${t("common.add")} ${name}`}
                      className="absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-full bg-white shadow-md ring-1 ring-black/5"
                    >
                      <Plus className="h-5 w-5 text-black" strokeWidth={2.5} />
                    </button>
                  ) : (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-white px-1.5 py-1 shadow-md ring-1 ring-black/5"
                    >
                      <button type="button" onClick={() => sub(item.id)} aria-label={t("common.remove")} className="grid h-6 w-6 place-items-center">
                        <Minus className="h-4 w-4 text-black" strokeWidth={2.5} />
                      </button>
                      <span className="min-w-[14px] text-center text-sm font-bold text-black">{qty}</span>
                      <button type="button" onClick={() => add(item.id)} aria-label={t("common.add")} className="grid h-6 w-6 place-items-center">
                        <Plus className="h-4 w-4 text-black" strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                </div>
                <h3 className="mt-2.5 text-[17px] font-bold leading-tight text-black">{name}</h3>
                <div className="mt-1 flex items-center gap-1.5 text-[14px] text-black">
                  <span className="font-medium">{formatPrice(item.price, i18n.language)}</span>
                  <span className="text-gray-400">•</span>
                  <ThumbsUp className="h-3.5 w-3.5" strokeWidth={2.5} />
                  <span className="font-medium">{item.rating}%</span>
                  <span className="text-gray-500">({formatNumber(item.reviews, i18n.language)})</span>
                </div>
                <p className="mt-1 line-clamp-2 text-[14px] leading-snug text-gray-500">
                  {t(`cookies.${item.tKey}.desc`)}
                </p>
              </article>
            );
          })}
        </section>
      )}

      {activeTab === "packs" && (
        <section className="relative pt-5">
          <button
            type="button"
            onClick={() => scrollToPack(Math.max(0, packIndex - 1))}
            aria-label={t("menu.prevPack")}
            className={`absolute left-2 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-black shadow-lg backdrop-blur-sm transition-opacity ${packIndex === 0 ? "pointer-events-none opacity-0" : "opacity-100"}`}
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2.5} />
          </button>

          <div
            ref={packsRef}
            className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth px-4 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {packs.map((item) => {
              const qty = qtyOf(item.id);
              const name = t(`packs.${item.id}.name`);
              return (
                <article
                  key={item.id}
                  className="mr-4 w-[82vw] max-w-[340px] flex-shrink-0 snap-center rounded-2xl bg-[#f6f6f6] p-3 last:mr-4"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedPack(item)}
                    aria-label={t("menu.viewDetails", { name })}
                    className="relative block aspect-[4/3] w-full overflow-hidden rounded-xl cursor-pointer text-left"
                  >
                    <img
                      src={item.image}
                      alt={name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      width={1024}
                      height={1024}
                    />
                  </button>
                  <div className="mt-3 flex flex-col">
                    <button
                      type="button"
                      onClick={() => setSelectedPack(item)}
                      className="text-left"
                    >
                      <h3 className="text-[18px] font-bold leading-tight text-black">{name}</h3>
                      <p className="mt-1 text-[15px] font-bold text-black">{formatPrice(item.price, i18n.language)}</p>
                      <p className="mt-1.5 text-[14px] leading-snug text-gray-500">{t(`packs.${item.id}.desc`)}</p>
                    </button>

                    {qty === 0 ? (
                      <button
                        type="button"
                        onClick={() => add(item.id)}
                        aria-label={`${t("common.addToCart")} ${name}`}
                        className="mt-4 w-full rounded-full bg-black py-3 text-center text-[14px] font-bold text-white shadow-md active:scale-[0.98] transition-transform"
                      >
                        {t("common.addToCart")}
                      </button>
                    ) : (
                      <div className="mt-4 flex items-center justify-between rounded-full bg-white px-2 py-2 shadow-sm ring-1 ring-black/5">
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => sub(item.id)} aria-label={t("common.remove")} className="grid h-8 w-8 place-items-center rounded-full bg-gray-100 active:scale-90 transition-transform">
                            <Minus className="h-4 w-4 text-black" strokeWidth={2.5} />
                          </button>
                          <span className="min-w-[24px] text-center text-sm font-bold text-black">{qty}</span>
                          <button type="button" onClick={() => add(item.id)} aria-label={t("common.add")} className="grid h-8 w-8 place-items-center rounded-full bg-gray-100 active:scale-90 transition-transform">
                            <Plus className="h-4 w-4 text-black" strokeWidth={2.5} />
                          </button>
                        </div>
                        <span className="pr-3 text-sm font-bold text-black">{formatPrice(qty * item.price, i18n.language)}</span>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => scrollToPack(Math.min(packs.length - 1, packIndex + 1))}
            aria-label={t("menu.nextPack")}
            className={`absolute right-2 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-black shadow-lg backdrop-blur-sm transition-opacity ${packIndex === packs.length - 1 ? "pointer-events-none opacity-0" : "opacity-100"}`}
          >
            <ChevronRight className="h-6 w-6" strokeWidth={2.5} />
          </button>

          <div className="flex justify-center gap-2 pb-2">
            {packs.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToPack(i)}
                aria-label={t("menu.goToPack", { n: i + 1 })}
                className={`h-2 w-2 rounded-full transition-all ${i === packIndex ? "w-5 bg-black" : "bg-gray-300"}`}
              />
            ))}
          </div>
        </section>
      )}

      {activeTab === "deluxe" && (
        <section className="flex flex-col items-center justify-center px-4 pt-16 text-center">
          <p className="text-[17px] font-medium text-gray-400">{t("common.comingSoon")}</p>
        </section>
      )}

      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-20 z-40 flex justify-center px-4">
          <button className="flex items-center gap-3 rounded-full bg-black px-6 py-3.5 text-white shadow-2xl">
            <ShoppingCart className="h-5 w-5" strokeWidth={2.5} />
            <span className="text-[15px] font-bold">
              {t("common.viewCart")} • {formatNumber(cartCount, i18n.language)}
            </span>
            <span className="text-[15px] font-bold text-white/80">
              {formatPrice(cartTotal, i18n.language)}
            </span>
          </button>
        </div>
      )}

      <BottomNav />

      <Dialog open={!!selectedCookie} onOpenChange={(open) => !open && setSelectedCookie(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-0 p-0 sm:max-w-md">
          <DialogTitle className="sr-only">{selectedCookie ? t(`cookies.${selectedCookie.tKey}.name`) : ""}</DialogTitle>
          <DialogDescription className="sr-only">
            {selectedCookie ? t("menu.detailOf", { name: t(`cookies.${selectedCookie.tKey}.name`) }) : ""}
          </DialogDescription>
          {selectedCookie && (
            <div className="flex flex-col">
              <div className="relative aspect-square bg-[#f6f6f6]">
                <img
                  src={selectedCookie.image}
                  alt={t(`cookies.${selectedCookie.tKey}.name`)}
                  className="h-full w-full object-cover"
                  width={1024}
                  height={1024}
                />
                {selectedCookie.badge && (
                  <span className="absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-[#0a8a3a] text-xs font-extrabold text-white">
                    {selectedCookie.badge}
                  </span>
                )}
                {selectedCookie.tag && (
                  <span className="absolute right-3 top-3 rounded-full bg-[#6b2c91] px-2.5 py-1.5 text-[10px] font-extrabold tracking-wide text-white">
                    {t(`tags.${selectedCookie.tag}`)}
                  </span>
                )}
              </div>

              <div className="px-5 pb-6 pt-4">
                <h2 className="text-[22px] font-bold leading-tight text-black">
                  {t(`cookies.${selectedCookie.tKey}.name`)}
                </h2>
                <div className="mt-1.5 flex items-center gap-2 text-[15px] text-black">
                  <span className="font-bold">{formatPrice(selectedCookie.price, i18n.language)}</span>
                  <span className="text-gray-300">|</span>
                  <ThumbsUp className="h-4 w-4" strokeWidth={2.5} />
                  <span className="font-medium">{selectedCookie.rating}%</span>
                  <span className="text-gray-500">({formatNumber(selectedCookie.reviews, i18n.language)} {t("common.reviews")})</span>
                </div>
                <p className="mt-3 text-[15px] leading-relaxed text-gray-600">
                  {t(`cookies.${selectedCookie.tKey}.desc`)}
                </p>

                <div className="mt-6 flex items-center gap-4">
                  <div className="flex items-center gap-2 rounded-full bg-gray-100 px-2 py-1.5">
                    <button
                      onClick={() => sub(selectedCookie.id)}
                      disabled={detailQty === 0}
                      aria-label={t("common.remove")}
                      className="grid h-8 w-8 place-items-center rounded-full bg-white shadow-sm disabled:opacity-40"
                    >
                      <Minus className="h-4 w-4 text-black" strokeWidth={2.5} />
                    </button>
                    <span className="min-w-[28px] text-center text-base font-bold text-black">{detailQty}</span>
                    <button
                      onClick={() => add(selectedCookie.id)}
                      aria-label={t("common.add")}
                      className="grid h-8 w-8 place-items-center rounded-full bg-white shadow-sm"
                    >
                      <Plus className="h-4 w-4 text-black" strokeWidth={2.5} />
                    </button>
                  </div>
                  <button
                    onClick={() => add(selectedCookie.id)}
                    className="flex-1 rounded-full bg-black py-3.5 text-center text-[16px] font-bold text-white shadow-lg"
                  >
                    {detailQty === 0
                      ? t("common.addToCart")
                      : `${t("common.updateCart")} • ${formatPrice(detailQty * selectedCookie.price, i18n.language)}`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedPack} onOpenChange={(open) => !open && setSelectedPack(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-0 p-0 sm:max-w-md">
          <DialogTitle className="sr-only">{selectedPack ? t(`packs.${selectedPack.id}.name`) : ""}</DialogTitle>
          <DialogDescription className="sr-only">
            {selectedPack ? t("menu.detailOf", { name: t(`packs.${selectedPack.id}.name`) }) : ""}
          </DialogDescription>
          {selectedPack && (() => {
            const pack = selectedPack;
            const qty = qtyOf(pack.id);
            const name = t(`packs.${pack.id}.name`);
            return (
              <div className="flex flex-col">
                <div className="relative aspect-[4/3] bg-[#f6f6f6]">
                  <img
                    src={pack.image}
                    alt={name}
                    className="h-full w-full object-cover"
                    width={1024}
                    height={1024}
                  />
                </div>
                <div className="px-5 pb-6 pt-4">
                  <h2 className="text-[22px] font-bold leading-tight text-black">{name}</h2>
                  <p className="mt-1.5 text-[16px] font-bold text-black">{formatPrice(pack.price, i18n.language)}</p>
                  <p className="mt-2 text-[15px] leading-relaxed text-gray-600">{t(`packs.${pack.id}.desc`)}</p>

                  <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-gray-50 p-3 text-center">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{t("menu.cookies")}</p>
                      <p className="mt-1 text-[16px] font-bold text-black">{formatNumber(pack.cookieCount, i18n.language)}</p>
                    </div>
                    <div className="border-x border-gray-200">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{t("menu.serves")}</p>
                      <p className="mt-1 text-[14px] font-bold text-black">{t(`packs.${pack.id}.serves`)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{t("menu.calPerCookie")}</p>
                      <p className="mt-1 text-[16px] font-bold text-black">{formatNumber(pack.caloriesPerCookie, i18n.language)}</p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <h3 className="text-[13px] font-bold uppercase tracking-wide text-gray-500">{t("menu.ingredients")}</h3>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-gray-700">{t("packs.ingredients")}</p>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-[13px] font-bold uppercase tracking-wide text-gray-500">{t("menu.allergens")}</h3>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-gray-700">{t("packs.allergens")}</p>
                  </div>

                  <div className="mt-6 flex items-center gap-4">
                    <div className="flex items-center gap-2 rounded-full bg-gray-100 px-2 py-1.5">
                      <button
                        onClick={() => sub(pack.id)}
                        disabled={qty === 0}
                        aria-label={t("common.remove")}
                        className="grid h-8 w-8 place-items-center rounded-full bg-white shadow-sm disabled:opacity-40"
                      >
                        <Minus className="h-4 w-4 text-black" strokeWidth={2.5} />
                      </button>
                      <span className="min-w-[28px] text-center text-base font-bold text-black">{qty}</span>
                      <button
                        onClick={() => add(pack.id)}
                        aria-label={t("common.add")}
                        className="grid h-8 w-8 place-items-center rounded-full bg-white shadow-sm"
                      >
                        <Plus className="h-4 w-4 text-black" strokeWidth={2.5} />
                      </button>
                    </div>
                    <button
                      onClick={() => add(pack.id)}
                      className="flex-1 rounded-full bg-black py-3.5 text-center text-[16px] font-bold text-white shadow-lg"
                    >
                      {qty === 0
                        ? t("common.addToCart")
                        : `${t("common.updateCart")} • ${formatPrice(qty * pack.price, i18n.language)}`}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </main>
  );
}
