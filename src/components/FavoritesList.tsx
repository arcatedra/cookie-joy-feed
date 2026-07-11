import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Heart, ShoppingBag, Trash2, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  listFavorites,
  removeFavorite,
  type FavoriteRow,
} from "@/lib/favorites.functions";
import { storefrontApiRequest } from "@/lib/shopify";
import { useShopifyCartStore } from "@/stores/shopifyCartStore";
import { Button } from "@/components/ui/button";

const PRODUCT_BY_HANDLE_QUERY = `
  query ProductByHandle($handle: String!) {
    productByHandle(handle: $handle) {
      id
      title
      handle
      description
      images(first: 1) { edges { node { url altText } } }
      priceRange { minVariantPrice { amount currencyCode } }
      variants(first: 1) {
        edges {
          node {
            id
            title
            price { amount currencyCode }
            weight
            weightUnit
            selectedOptions { name value }
          }
        }
      }
    }
  }
`;

export function FavoritesList() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const fetchList = useServerFn(listFavorites);
  const remove = useServerFn(removeFavorite);
  const addItem = useShopifyCartStore((s) => s.addItem);

  const { data, isLoading, error } = useQuery({
    queryKey: ["favorites", user?.id ?? "anon"],
    queryFn: () => fetchList(),
    enabled: !!user,
  });

  const removeMut = useMutation({
    mutationFn: (productHandle: string) => remove({ data: { productHandle } }),
    onSuccess: (res) => {
      if (res && "ok" in res && !res.ok) {
        toast.error(res.error ?? t("favorites.error"));
        return;
      }
      qc.invalidateQueries({ queryKey: ["favorites"] });
      qc.invalidateQueries({ queryKey: ["profile-stats"] });
      toast.success(t("favorites.removed"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addToCartMut = useMutation({
    mutationFn: async (fav: FavoriteRow) => {
      const res = await storefrontApiRequest(PRODUCT_BY_HANDLE_QUERY, {
        handle: fav.productHandle,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = (res as any)?.data?.productByHandle;
      if (!p) throw new Error(t("favorites.productUnavailable"));
      const variantEdge = p.variants?.edges?.[0]?.node;
      if (!variantEdge) throw new Error(t("favorites.productUnavailable"));
      const { toKilograms } = await import("@/lib/shopify");
      await addItem({
        product: { node: p },
        variantId: variantEdge.id,
        variantTitle: variantEdge.title,
        price: variantEdge.price,
        quantity: 1,
        weightKg: toKilograms(variantEdge.weight, variantEdge.weightUnit),
        selectedOptions: variantEdge.selectedOptions ?? [],
      });
    },
    onSuccess: () => toast.success(t("favorites.addedToCart")),
    onError: (e: Error) => toast.error(e.message),
  });

  if (!user) {
    return (
      <div className="rounded-2xl bg-muted/40 p-6 text-center">
        <Heart className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">{t("favorites.signInFirst")}</p>
        <Link
          to="/auth"
          className="mt-3 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
        >
          {t("auth.signIn")}
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid place-items-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        {(error as Error).message}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl bg-muted/40 p-6 text-center">
        <Heart className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">{t("favorites.empty")}</p>
        <Link
          to="/shop"
          className="mt-3 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
        >
          {t("favorites.browseShop")}
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {data.map((fav) => (
        <li
          key={fav.id}
          className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm ring-1 ring-border"
        >
          <Link
            to="/product/$handle"
            params={{ handle: fav.productHandle }}
            className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-secondary/20"
          >
            {fav.productImageUrl ? (
              <img
                src={fav.productImageUrl}
                alt={fav.productTitle ?? fav.productHandle}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="grid h-full place-items-center text-muted-foreground">
                <ShoppingBag className="h-5 w-5" />
              </div>
            )}
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              to="/product/$handle"
              params={{ handle: fav.productHandle }}
              className="block truncate text-sm font-semibold text-card-foreground hover:underline"
            >
              {fav.productTitle ?? fav.productHandle}
            </Link>
            {fav.productPriceAmount != null && (
              <p className="text-xs text-muted-foreground">
                {fav.productPriceCurrency ?? "USD"}{" "}
                {fav.productPriceAmount.toFixed(2)}
              </p>
            )}
          </div>
          <div className="flex flex-shrink-0 items-center gap-1">
            <Button
              size="sm"
              variant="secondary"
              disabled={addToCartMut.isPending}
              onClick={() => addToCartMut.mutate(fav)}
              aria-label={t("favorites.addToCart")}
            >
              {addToCartMut.isPending && addToCartMut.variables?.id === fav.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShoppingBag className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={removeMut.isPending}
              onClick={() => removeMut.mutate(fav.productHandle)}
              aria-label={t("favorites.remove")}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
