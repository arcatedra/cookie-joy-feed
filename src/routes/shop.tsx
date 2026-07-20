import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Plus, ShoppingCart, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import i18n, { formatPrice } from "@/i18n";
import { useCart } from "@/lib/cart";
import { useSubscriptionGate } from "@/lib/subscription-gate";
import { listProductos, type Producto } from "@/lib/productos.functions";

export const productosQueryOptions = queryOptions({
  queryKey: ["productos", "shop"],
  queryFn: () => listProductos(),
});

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: i18n.t("shopPage.metaTitle") },
      { name: "description", content: i18n.t("shopPage.metaDesc") },
      { property: "og:title", content: i18n.t("shopPage.metaTitle") },
      { property: "og:description", content: i18n.t("shopPage.metaDesc") },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(productosQueryOptions),
  component: ShopPage,
});

function ShopPage() {
  const { t, i18n } = useTranslation();
  const cart = useCart();
  const gate = useSubscriptionGate();
  const { data: products } = useSuspenseQuery(productosQueryOptions);

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
              aria-label={t("common.cart")}
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
          {t("shopPage.subtitle")}
        </p>
      </header>

      <section className="mt-6 px-5">
        <div className="grid grid-cols-2 gap-4">
          {products.map((p: Producto) => {
            const price = Number(p.precio);
            return (
              <article
                key={p.id}
                className="relative overflow-hidden rounded-2xl bg-card p-3 shadow-sm ring-1 ring-border"
              >
                <div className="aspect-square overflow-hidden rounded-xl bg-cream">
                  {p.imagen_url ? (
                    <img
                      src={p.imagen_url}
                      alt={p.nombre}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      width={512}
                      height={512}
                    />
                  ) : (
                    <div className="h-full w-full bg-muted" />
                  )}
                </div>
                <div className="mt-3">
                  <h3 className="text-sm font-bold leading-tight text-foreground">
                    {p.nombre}
                  </h3>
                  {p.descripcion && (
                    <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                      {p.descripcion}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-1">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className="h-3 w-3 fill-amber-400 text-amber-400"
                        />
                      ))}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-primary">
                      {formatPrice(price, i18n.language)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    gate.guard(() => {
                      cart.add({
                        id: p.id,
                        name: p.nombre,
                        price,
                        image: p.imagen_url ?? "",
                      });
                      toast.success(
                        t("reels.addedToCart", {
                          name: p.nombre,
                          defaultValue: "{{name}} added to cart",
                        }),
                      );
                    });
                  }}
                  className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-orange text-white shadow-md transition active:scale-90"
                  aria-label={t("cartFloating.addAria", {
                    name: p.nombre,
                    defaultValue: "Add {{name}}",
                  })}
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
                defaultValue:
                  cart.count === 1
                    ? "{{count}} item · ${{total}}"
                    : "{{count}} items · ${{total}}",
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
