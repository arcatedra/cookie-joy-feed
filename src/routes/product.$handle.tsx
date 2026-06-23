import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShopifyCartDrawer } from "@/components/ShopifyCartDrawer";
import { PRODUCT_BY_HANDLE_QUERY, storefrontApiRequest } from "@/lib/shopify";
import { useShopifyCartStore } from "@/stores/shopifyCartStore";
import { useShopifyCartSync } from "@/hooks/useShopifyCartSync";
import i18n from "@/i18n";

interface ProductDetail {
  id: string;
  title: string;
  description: string;
  handle: string;
  images: { edges: Array<{ node: { url: string; altText: string | null } }> };
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        price: { amount: string; currencyCode: string };
        availableForSale: boolean;
        selectedOptions: Array<{ name: string; value: string }>;
      };
    }>;
  };
  options: Array<{ name: string; values: string[] }>;
}

export const Route = createFileRoute("/product/$handle")({
  head: ({ params }) => ({
    meta: [
      { title: i18n.t("product.metaTitle", { handle: params.handle }) },
      { name: "description", content: i18n.t("product.metaDesc", { handle: params.handle }) },
    ],
  }),
  component: ProductPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-sm text-red-600">{error.message}</div>
  ),
  notFoundComponent: () => <NotFoundBlock />,
});

function NotFoundBlock() {
  const { t } = useTranslation();
  return <div className="p-8 text-center">{t("product.notFound")}</div>;
}

function ProductPage() {
  const { t } = useTranslation();
  useShopifyCartSync();
  const { handle } = Route.useParams();
  const [variantIndex, setVariantIndex] = useState(0);
  const addItem = useShopifyCartStore((s) => s.addItem);
  const isLoading = useShopifyCartStore((s) => s.isLoading);

  const { data, isLoading: isFetching, error } = useQuery({
    queryKey: ["shopify", "product", handle],
    queryFn: async () => {
      const res = await storefrontApiRequest(PRODUCT_BY_HANDLE_QUERY, { handle });
      return (res?.data?.product ?? null) as ProductDetail | null;
    },
  });

  if (isFetching) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-sm text-red-600">{(error as Error).message}</div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center">
        <h1 className="text-xl font-semibold">{t("product.notFound")}</h1>
        <Link to="/shop" className="mt-4 inline-block text-sm text-amber-700 underline">
          {t("product.backToShop")}
        </Link>
      </div>
    );
  }

  const variant = data.variants.edges[variantIndex]?.node;
  const image = data.images.edges[0]?.node;

  const handleAdd = async () => {
    if (!variant) return;
    await addItem({
      product: { node: data } as any,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions ?? [],
    });
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/shop"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t("product.backToShop")}
        </Link>
        <ShopifyCartDrawer />
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-xl bg-secondary/20">
          {image ? (
            <img
              src={image.url}
              alt={image.altText ?? data.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center text-muted-foreground">
              <ShoppingBag className="h-12 w-12" />
            </div>
          )}
        </div>

        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">{data.title}</h1>
          {variant && (
            <p className="mt-2 text-2xl font-bold">
              {variant.price.currencyCode} {parseFloat(variant.price.amount).toFixed(2)}
            </p>
          )}
          <p className="mt-4 whitespace-pre-line text-sm text-muted-foreground">
            {data.description}
          </p>

          {data.variants.edges.length > 1 && (
            <div className="mt-6">
              <label className="text-sm font-medium">{t("product.variant")}</label>
              <select
                value={variantIndex}
                onChange={(e) => setVariantIndex(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {data.variants.edges.map((v, i) => (
                  <option key={v.node.id} value={i}>
                    {v.node.title} — {v.node.price.currencyCode}{" "}
                    {parseFloat(v.node.price.amount).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            onClick={handleAdd}
            disabled={isLoading || !variant?.availableForSale}
            size="lg"
            className="mt-6 w-full"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : variant?.availableForSale ? (
              t("product.addToCart")
            ) : (
              t("product.soldOut")
            )}
          </Button>
        </div>
      </div>
    </main>
  );
}
