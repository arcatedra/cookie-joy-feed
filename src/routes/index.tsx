import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/i18n";
import { ChevronLeft, ChevronRight, Star, Plus, Clock } from "lucide-react";
import { useCart } from "@/lib/cart";
import { CookiesTV } from "@/components/CookiesTV";
import imgPack6 from "@/assets/pack-6.jpg";
import imgPack9 from "@/assets/pack-9.jpg";
import imgPack12 from "@/assets/pack-12.jpg";
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
import imgVegan from "@/assets/ins-vegan-choc.jpg";
import imgBox from "@/assets/cookie-box.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ZENDA — Galletas Artesanales Premium" },
      { name: "description", content: "Descubre galletas gourmet, packs personalizados y suscripciones mensuales en ZENDA." },
    ],
  }),
  component: Home,
});

// ============ Banners ============
const banners = [
  {
    id: "b1",
    eyebrow: "OFERTAS DE LA SEMANA",
    title: "20% de descuento en Galletas Rellenas de Chispas de Chocolate",
    cta: "Comprar ahora",
    to: "/menu",
    bg: "linear-gradient(120deg, #3d1b0e 0%, #6b2f15 55%, #b06a36 100%)",
    img: imgDoubleChoc,
  },
  {
    id: "b2",
    eyebrow: "NUEVO LANZAMIENTO",
    title: "Prueba la línea Saludable y Vegana",
    cta: "Explorar línea vegana",
    to: "/menu",
    bg: "linear-gradient(120deg, #14361f 0%, #2a6b3f 55%, #8fc18a 100%)",
    img: imgVegan,
  },
  {
    id: "b3",
    eyebrow: "CAJAS DE REGALO PREMIUM",
    title: "El detalle perfecto para cualquier ocasión",
    cta: "Ver cajas de regalo",
    to: "/menu",
    bg: "linear-gradient(120deg, #2a1810 0%, #5a3520 55%, #d4a574 100%)",
    img: imgPack12,
  },
];

// ============ Slider products ============
interface SliderProduct {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  image: string;
  discountPct?: number;
}

const sliderProducts: SliderProduct[] = [
  { id: "sp1", name: "Galleta de Pistacho y Chocolate Blanco", price: 4.5, oldPrice: 5.5, rating: 4.8, reviews: 1284, image: imgWhiteMac, discountPct: 18 },
  { id: "sp2", name: "Triple Chocolate Fudge", price: 3.95, oldPrice: 4.95, rating: 4.9, reviews: 2156, image: imgDoubleChoc, discountPct: 20 },
  { id: "sp3", name: "Snickerdoodle Clásica", price: 3.25, oldPrice: 3.95, rating: 4.7, reviews: 892, image: imgSnicker, discountPct: 18 },
  { id: "sp4", name: "Avena y Pasas con Canela", price: 3.5, oldPrice: 4.25, rating: 4.6, reviews: 645, image: imgOatmeal, discountPct: 17 },
  { id: "sp5", name: "Mantequilla de Maní Crujiente", price: 3.75, oldPrice: 4.5, rating: 4.8, reviews: 1043, image: imgPB, discountPct: 16 },
  { id: "sp6", name: "Cookies & Cream Premium", price: 4.25, oldPrice: 5.0, rating: 4.9, reviews: 1789, image: imgCookiesCream, discountPct: 15 },
  { id: "sp7", name: "Doble Chispas de Chocolate", price: 3.95, oldPrice: 4.75, rating: 4.7, reviews: 921, image: imgChocChunk, discountPct: 17 },
  { id: "sp8", name: "Menta y Chocolate Dark", price: 4.5, oldPrice: 5.5, rating: 4.6, reviews: 512, image: imgMint, discountPct: 18 },
  { id: "sp9", name: "M&M Festiva", price: 4.0, oldPrice: 4.75, rating: 4.8, reviews: 1322, image: imgMM, discountPct: 16 },
  { id: "sp10", name: "Azúcar Glaseada Vainilla", price: 3.25, oldPrice: 3.95, rating: 4.5, reviews: 478, image: imgSugar, discountPct: 18 },
];

function Home() {
  const { t } = useTranslation();
  return (
    <main
      className="min-h-screen"
      style={{
        backgroundColor: "#eaeded",
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.04) 1px, transparent 0)",
        backgroundSize: "18px 18px",
      }}
    >
      {/* Reels stories bar (Instagram-style, above the hero) */}
      <CookiesTV />

      {/* Category grid */}
      <section className="relative pt-4">
        <CategoryCardGrid />
      </section>

      {/* Secondary band */}
      <section className="mx-auto mt-6 max-w-[1500px] px-3 pb-12 md:px-6">
        <div className="rounded-md bg-white p-5 shadow-sm ring-1 ring-black/5 md:p-7">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h3 className="text-lg font-extrabold text-[#1a0f0a] md:text-xl">
                {t("home.promoTitle")}
              </h3>
              <p className="mt-1 text-sm text-[#444]">{t("home.promoSubtitle")}</p>
            </div>
            <Link
              to="/menu"
              className="rounded-full bg-amber-400 px-6 py-2.5 text-sm font-bold text-[#1a0f0a] shadow transition hover:bg-amber-300"
            >
              {t("home.promoCta")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ============================================================
 * HERO CAROUSEL
 * ========================================================== */
function HeroCarousel() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setI((p) => (p + 1) % banners.length), 5500);
    return () => window.clearInterval(id);
  }, [paused]);

  const prev = () => setI((p) => (p - 1 + banners.length) % banners.length);
  const next = () => setI((p) => (p + 1) % banners.length);

  return (
    <div
      className="relative w-full overflow-hidden bg-[#1a0f0a]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      <div className="relative h-[220px] sm:h-[300px] md:h-[420px] lg:h-[480px]">
        {banners.map((b, idx) => (
          <div
            key={b.id}
            className={`absolute inset-0 transition-opacity duration-700 ${
              idx === i ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            style={{ background: b.bg }}
            aria-hidden={idx !== i}
          >
            {/* gradient overlay readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/10 to-transparent" />
            {/* image (right side on desktop) */}
            <img
              src={b.img}
              alt=""
              className="absolute right-0 top-0 hidden h-full w-1/2 object-cover opacity-80 md:block"
              style={{
                maskImage:
                  "linear-gradient(to left, black 55%, transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(to left, black 55%, transparent 100%)",
              }}
              loading={idx === 0 ? "eager" : "lazy"}
            />
            <div className="relative z-10 mx-auto flex h-full max-w-[1500px] flex-col justify-center px-5 md:px-10">
              <p className="text-[11px] font-bold tracking-[0.25em] text-amber-300 md:text-xs">
                {b.eyebrow}
              </p>
              <h2 className="mt-2 max-w-xl text-2xl font-extrabold leading-tight text-white drop-shadow md:text-4xl lg:text-5xl">
                {b.title}
              </h2>
              <Link
                to={b.to}
                className="mt-4 inline-flex w-fit items-center rounded-full bg-amber-400 px-5 py-2.5 text-sm font-bold text-[#1a0f0a] shadow-lg transition hover:bg-amber-300 md:mt-6 md:px-7 md:py-3 md:text-base"
              >
                {b.cta}
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Arrows */}
      <button
        type="button"
        onClick={prev}
        aria-label="Banner anterior"
        className="absolute left-2 top-1/2 z-20 grid -translate-y-1/2 place-items-center rounded-full bg-white/80 p-2 text-[#1a0f0a] shadow transition hover:bg-white md:left-4 md:p-3"
      >
        <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
      </button>
      <button
        type="button"
        onClick={next}
        aria-label="Banner siguiente"
        className="absolute right-2 top-1/2 z-20 grid -translate-y-1/2 place-items-center rounded-full bg-white/80 p-2 text-[#1a0f0a] shadow transition hover:bg-white md:right-4 md:p-3"
      >
        <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-2 md:bottom-5">
        {banners.map((b, idx) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setI(idx)}
            aria-label={`Ir al banner ${idx + 1}`}
            className={`h-2 rounded-full transition-all ${
              idx === i ? "w-8 bg-amber-400" : "w-2 bg-white/60 hover:bg-white"
            }`}
          />
        ))}
      </div>

      {/* Bottom fade into page bg */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-b from-transparent to-[#eaeded] md:h-24" />
    </div>
  );
}

/* ============================================================
 * CATEGORY CARD GRID
 * ========================================================== */
function CategoryCardGrid() {
  return (
    <div className="relative z-10 mx-auto max-w-[1500px] px-3 md:px-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <BestSellersCard />
        <BuildPackCard />
        <SubscriptionCard />
        <FlashDealCard />
      </div>
    </div>
  );
}

function CardShell({
  title,
  link,
  children,
}: {
  title: string;
  link: { to: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <article className="flex flex-col rounded-md bg-white p-4 shadow-md ring-1 ring-black/5 md:p-5">
      <h3 className="text-base font-extrabold text-[#1a0f0a] md:text-lg">{title}</h3>
      <div className="mt-3 flex-1">{children}</div>
      <Link
        to={link.to}
        className="mt-3 inline-block text-xs font-semibold text-[#007185] hover:text-[#c7511f] hover:underline"
      >
        {link.label}
      </Link>
    </article>
  );
}

function BestSellersCard() {
  const { t } = useTranslation();
  const items = [
    { key: "classic", img: imgChocChunk },
    { key: "redVelvet", img: imgCookiesCream },
    { key: "tripleChoc", img: imgDoubleChoc },
    { key: "oatRaisin", img: imgOatmeal },
  ] as const;
  return (
    <CardShell
      title={t("home.cards.bestSellersTitle")}
      link={{ to: "/menu", label: t("home.cards.bestSellersLink") }}
    >
      <div className="grid grid-cols-2 gap-2">
        {items.map((it) => (
          <Link key={it.key} to="/menu" className="group">
            <div className="aspect-square overflow-hidden rounded-sm bg-[#f7f7f7]">
              <img
                src={it.img}
                alt={t(`home.cards.best.${it.key}`)}
                loading="lazy"
                className="h-full w-full object-cover transition group-hover:scale-105"
              />
            </div>
            <p className="mt-1 line-clamp-1 text-[11px] text-[#444] group-hover:text-[#c7511f]">
              {t(`home.cards.best.${it.key}`)}
            </p>
          </Link>
        ))}
      </div>
    </CardShell>
  );
}

function BuildPackCard() {
  const { t } = useTranslation();
  return (
    <CardShell
      title={t("home.cards.buildPackTitle")}
      link={{ to: "/menu", label: t("home.cards.buildPackLink") }}
    >
      <Link to="/menu" className="block">
        <div className="aspect-[4/3] overflow-hidden rounded-sm bg-[#f7f7f7]">
          <img
            src={imgBox}
            alt={t("home.cards.buildPackAlt")}
            loading="lazy"
            className="h-full w-full object-cover transition hover:scale-[1.03]"
          />
        </div>
      </Link>
      <Link
        to="/menu"
        className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-amber-400 px-3 py-2 text-xs font-bold text-[#1a0f0a] shadow-sm transition hover:bg-amber-300"
      >
        {t("home.cards.buildPackCta")}
      </Link>
    </CardShell>
  );
}

function SubscriptionCard() {
  const { t } = useTranslation();
  return (
    <CardShell
      title={t("home.cards.subscriptionTitle")}
      link={{ to: "/subscribe", label: t("home.cards.subscriptionLink") }}
    >
      <Link to="/subscribe" className="block">
        <div className="aspect-[4/3] overflow-hidden rounded-sm bg-gradient-to-br from-[#3d2418] to-[#1a0f0a] p-3 text-white">
          <div className="flex h-full flex-col justify-between">
            <p className="text-[10px] font-bold tracking-[0.2em] text-amber-300">
              {t("home.cards.subscriptionClub")}
            </p>
            <div>
              <p className="text-xl font-extrabold leading-tight md:text-2xl">
                {t("home.cards.subscriptionHeadline")}
              </p>
              <p className="mt-1 text-[11px] text-white/80">
                {t("home.cards.subscriptionSubcopy")}
              </p>
            </div>
            <div className="flex items-end justify-between">
              <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-[#1a0f0a]">
                {t("home.cards.subscriptionPrice")}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </CardShell>
  );
}

function useCountdown(targetMs: number) {
  const [now, setNow] = useState<number>(() => targetMs);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const diff = Math.max(0, targetMs - now);
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return { h, m, s };
}

function FlashDealCard() {
  const { t } = useTranslation();
  // Stable midnight-based target (avoids hydration mismatch)
  const target = useMemo(() => {
    const t = new Date();
    t.setHours(23, 59, 59, 0);
    return t.getTime();
  }, []);
  const { h, m, s } = useCountdown(target);
  const stockPct = 38;
  const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return (
    <CardShell
      title={t("home.cards.flashTitle")}
      link={{ to: "/menu", label: t("home.cards.flashLink") }}
    >
      <Link to="/menu" className="block">
        <div className="flex gap-3">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-sm bg-[#f7f7f7]">
            <img src={imgPack9} alt={t("home.cards.flashAlt")} loading="lazy" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-xs font-semibold text-[#1a0f0a]">
              {t("home.cards.flashProduct")}
            </p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-lg font-extrabold text-[#b12704]">$19.99</span>
              <span className="text-[11px] text-[#888] line-through">$28.00</span>
            </div>
            <span className="mt-1 inline-block rounded-sm bg-[#cc0c39] px-1.5 py-0.5 text-[10px] font-bold text-white">
              -29%
            </span>
          </div>
        </div>
      </Link>
      <div className="mt-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#eee]">
          <div className="h-full rounded-full bg-[#cc0c39]" style={{ width: `${stockPct}%` }} />
        </div>
        <p className="mt-1 text-[10px] text-[#666]">{t("home.cards.flashClaimed", { pct: 100 - stockPct })}</p>
      </div>
      <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-[#b12704]">
        <Clock className="h-3.5 w-3.5" />
        {t("home.cards.flashEndsIn", { time })}
      </div>
    </CardShell>
  );
}

/* ============================================================
 * PRODUCT SLIDER
 * ========================================================== */
function ProductSlider() {
  const cart = useCart();
  return (
    <section className="mx-auto mt-6 max-w-[1500px] px-3 md:px-6">
      <div className="rounded-md bg-white p-4 shadow-sm ring-1 ring-black/5 md:p-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-[#1a0f0a] md:text-2xl">
              Inspirado en tus antojos
            </h2>
            <p className="mt-0.5 text-xs text-[#555]">
              Selección horneada hoy · Envío en 24h
            </p>
          </div>
          <Link to="/menu" className="hidden text-xs font-semibold text-[#007185] hover:underline sm:block">
            Ver más
          </Link>
        </div>

        <div className="no-scrollbar mt-4 flex snap-x gap-3 overflow-x-auto pb-3">
          {sliderProducts.map((p) => (
            <article
              key={p.id}
              className="flex w-[170px] shrink-0 snap-start flex-col overflow-hidden rounded-md ring-1 ring-black/5 transition hover:shadow-md sm:w-[200px] md:w-[220px]"
            >
              <Link to="/menu" className="relative block aspect-square overflow-hidden bg-[#f7f7f7]">
                <img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-cover transition hover:scale-105" />
                {p.discountPct ? (
                  <span className="absolute left-2 top-2 rounded-sm bg-emerald-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white shadow">
                    -{p.discountPct}%
                  </span>
                ) : null}
              </Link>
              <div className="flex flex-1 flex-col p-3">
                <h3 className="line-clamp-2 min-h-[2.4em] text-xs font-semibold text-[#0f1111]">
                  {p.name}
                </h3>
                <div className="mt-1 flex items-center gap-1">
                  <Stars rating={p.rating} />
                  <span className="text-[11px] text-[#007185]">({p.reviews.toLocaleString("es-ES")})</span>
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-base font-extrabold text-[#0f1111]">
                    ${p.price.toFixed(2)}
                  </span>
                  {p.oldPrice ? (
                    <span className="text-[11px] text-[#888] line-through">${p.oldPrice.toFixed(2)}</span>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    cart.add({ id: `slider-${p.id}`, name: p.name, price: p.price, image: p.image })
                  }
                  className="mt-2 inline-flex items-center justify-center gap-1 rounded-full bg-[#c8956d] px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#a87852] active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar al carrito
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="inline-flex items-center" aria-label={`${rating} de 5 estrellas`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < full || (i === full && half);
        return (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${filled ? "fill-amber-400 text-amber-400" : "text-amber-400/30"}`}
            strokeWidth={1.5}
          />
        );
      })}
      <span className="ml-1 text-[11px] font-semibold text-[#0f1111]">{rating.toFixed(1)}</span>
    </span>
  );
}
