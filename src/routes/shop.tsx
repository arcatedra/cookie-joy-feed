import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Loader2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShopifyCartDrawer } from "@/components/ShopifyCartDrawer";
import {
  PRODUCTS_QUERY,
  storefrontApiRequest,
  type ShopifyProduct,
} from "@/lib/shopify";
import { useShopifyCartStore } from "@/stores/shopifyCartStore";
import { useShopifyCartSync } from "@/hooks/useShopifyCartSync";
import i18n from "@/i18n";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: i18n.t("shop.metaTitle") },
      { name: "description", content: i18n.t("shop.metaDesc") },
      { property: "og:title", content: i18n.t("shop.metaTitle") },
      { property: "og:description", content: i18n.t("shop.ogDesc") },
    ],
  }),
  component: ShopPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-red-600">{error.message}</div>
  ),
  notFoundComponent: () => <NotFoundBlock />,
});

function NotFoundBlock() {
  const { t } = useTranslation();
  return <div className="p-8 text-center">{t("shop.notFound")}</div>;
}

function ShopPage() {
  const { t } = useTranslation();
  useShopifyCartSync();

  const { data, isLoading, error } = useQuery({
    queryKey: ["shopify", "products"],
    queryFn: async () => {
      const res = await storefrontApiRequest(PRODUCTS_QUERY, { first: 50, query: null });
      return (res?.data?.products?.edges ?? []) as ShopifyProduct[];
    },
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
            {t("shop.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("shop.subtitle")}</p>
        </div>
        <ShopifyCartDrawer />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {t("shop.loadError", { message: (error as Error).message })}
        </div>
      )}

      {data && data.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-12 text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">{t("shop.noProducts")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("shop.noProductsDesc")}</p>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => (
            <ProductCard key={p.node.id} product={p} />
          ))}
        </div>
      )}
    </main>
  );
}

function ProductCard({ product }: { product: ShopifyProduct }) {
  const { t } = useTranslation();
  const addItem = useShopifyCartStore((s) => s.addItem);
  const isLoading = useShopifyCartStore((s) => s.isLoading);
  const variant = product.node.variants.edges[0]?.node;
  const image = product.node.images.edges[0]?.node;
  const price = product.node.priceRange.minVariantPrice;

  const handleAdd = async () => {
    if (!variant) return;
    const { toKilograms } = await import("@/lib/shopify");
    await addItem({
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      weightKg: toKilograms(variant.weight, variant.weightUnit),
      selectedOptions: variant.selectedOptions ?? [],
    });
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:shadow-md">
      <Link
        to="/product/$handle"
        params={{ handle: product.node.handle }}
        className="block aspect-square overflow-hidden bg-secondary/20"
      >
        {image ? (
          <img
            src={image.url}
            alt={image.altText ?? product.node.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground">
            <ShoppingBag className="h-10 w-10" />
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link
          to="/product/$handle"
          params={{ handle: product.node.handle }}
          className="font-semibold text-foreground hover:underline"
        >
          {product.node.title}
        </Link>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {product.node.description}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-bold">
            {price.currencyCode} {parseFloat(price.amount).toFixed(2)}
          </span>
          <Button onClick={handleAdd} disabled={isLoading || !variant} size="sm">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("shop.addToCart")}
          </Button>
        </div>
      </div>
    </article>
  );
}
