import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Plus, ShoppingCart, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { formatPrice, formatNumber } from "@/i18n";
import { useCart } from "@/lib/cart";
import { useSubscriptionGate } from "@/lib/subscription-gate";
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

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Tienda — HAZOREX" },
      {
        name: "description",
        content:
          "Compra galletas artesanales HAZOREX por unidad. Pago seguro con Stripe.",
      },
      { property: "og:title", content: "Tienda HAZOREX" },
      {
        property: "og:description",
        content: "Catálogo completo de galletas HAZOREX con pago seguro.",
      },
    ],
  }),
  component: ShopPage,
});

const products = [
  { id: "shop-1", key: "c1", price: 3.75, rating: 5, reviews: 272, image: imgChocChunk },
  { id: "shop-2", key: "c2", price: 3.75, rating: 5, reviews: 184, image: imgCookiesCream },
  { id: "shop-3", key: "c2", price: 3.75, rating: 5, reviews: 125, image: imgSnicker },
  { id: "shop-4", key: "c3", price: 3.75, rating: 5, reviews: 134, image: imgSugar },
  { id: "shop-5", key: "c4", price: 3.75, rating: 5, reviews: 197, image: imgDoubleChoc },
  { id: "shop-6", key: "c5", price: 3.75, rating: 5, reviews: 98, image: imgOatmeal },
  { id: "shop-7", key: "c6", price: 3.75, rating: 5, reviews: 95, image: imgWhiteMac },
  { id: "shop-8", key: "c7", price: 3.75, rating: 5, reviews: 79, image: imgMM },
  { id: "shop-9", key: "c8", price: 3.75, rating: 5, reviews: 56, image: imgPB },
  { id: "shop-10", key: "c10", price: 3.75, rating: 5, reviews: 23, image: imgMint },
];

function ShopPage() {
  const { t, i18n } = useTranslation();
  const cart = useCart();
  const gate = useSubscriptionGate();

  return (
    <main className="min-h-screen bg-background pb-24">
      <header className="relative bg-primary px-5 pb-5 pt-12 text-primary-foreground">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/10"
            aria-label={t("common.back")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-bold uppercase tracking-[0.15em]">
            HAZOREX
          </h1>
          <div className="flex items-center gap-2">
            <Link
              to="/cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/10"
              aria-label="cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {cart.count > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-cta px-1 text-[10px] font-bold text-cta-foreground">
                  {cart.count}
                </span>
              )}
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
        <p className="mt-4 text-xs uppercase tracking-wider opacity-80">
          Compra por unidad · Pago seguro con Stripe
        </p>
      </header>

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
                  <h3 className="text-sm font-bold leading-tight text-foreground">
                    {name}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                    {t(`cookies.${p.key}.caption`)}
                  </p>
                  <div className="mt-1 flex items-center gap-1">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${
                            i < p.rating
                              ? "fill-amber-400 text-amber-400"
                              : "fill-muted text-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      ({formatNumber(p.reviews, i18n.language)})
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-primary">
                      {formatPrice(p.price, i18n.language)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    cart.add({
                      id: p.id,
                      name,
                      price: p.price,
                      image: p.image,
                    });
                    toast.success(t("reels.addedToCart", { name, defaultValue: "{{name}} added to cart" }));
                  }}
                  className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-orange text-white shadow-md transition active:scale-90"
                  aria-label={t("cartFloating.addAria", { name, defaultValue: "Add {{name}}" })}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </article>
            );
          })}
        </div>

        {cart.count > 0 && (
          <div className="fixed inset-x-0 bottom-16 z-40 mx-auto flex max-w-md items-center justify-between gap-3 rounded-full bg-primary px-5 py-3 text-primary-foreground shadow-2xl md:bottom-6">
            <span className="text-sm font-bold">
              {t(cart.count === 1 ? "cartFloating.one" : "cartFloating.other", {
                count: cart.count,
                total: cart.total.toFixed(2),
                defaultValue: cart.count === 1 ? "{{count}} item · ${{total}}" : "{{count}} items · ${{total}}",
              })}
            </span>
            <Link
              to="/cart"
              className="rounded-full bg-cta px-4 py-2 text-xs font-bold uppercase tracking-wider text-cta-foreground"
            >
              {t("cartFloating.goTo", "Ir al carrito")}
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
