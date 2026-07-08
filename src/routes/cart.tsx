import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ExternalLink, Loader2, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useShopifyCartStore } from "@/stores/shopifyCartStore";
import { Button } from "@/components/ui/button";
import { localizeShopifyProduct } from "@/lib/shopify-i18n";
import i18n from "@/i18n";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: i18n.t("cartPage.metaTitle", "Tu carrito — HAZOREX") },
      { name: "description", content: i18n.t("cartPage.metaDesc", "Revisa los productos de tu carrito antes de finalizar la compra.") },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { t } = useTranslation();
  const items = useShopifyCartStore((s) => s.items);
  const isLoading = useShopifyCartStore((s) => s.isLoading);
  const isSyncing = useShopifyCartStore((s) => s.isSyncing);
  const updateQuantity = useShopifyCartStore((s) => s.updateQuantity);
  const removeItem = useShopifyCartStore((s) => s.removeItem);
  const getCheckoutUrl = useShopifyCartStore((s) => s.getCheckoutUrl);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce(
    (s, i) => s + parseFloat(i.price.amount) * i.quantity,
    0,
  );
  const currency = items[0]?.price.currencyCode || "$";

  const handleCheckout = () => {
    const url = getCheckoutUrl();
    if (url) window.open(url, "_blank");
  };

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-[#f4f1ea]">
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white shadow">
            <ShoppingBag className="h-9 w-9 text-[#1e3a5f]" />
          </div>
          <h1 className="mt-5 text-xl font-bold text-[#1e3a5f]">
            {t("checkout.emptyTitle", "Tu carrito está vacío")}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {t("checkout.emptyDesc", "Explora nuestros productos y añade algo delicioso.")}
          </p>
          <Link
            to="/shop"
            className="mt-6 inline-block rounded-lg bg-[#1e3a5f] px-6 py-3 text-sm font-bold text-white shadow hover:bg-[#16294a]"
          >
            {t("checkout.exploreCookies", "Ver tienda")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f1ea]">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-extrabold text-[#1e3a5f]">
          {t("cartDrawer.title", "Tu carrito")} ({totalItems})
        </h1>

        <ul className="flex flex-col divide-y divide-gray-200 rounded-xl bg-white shadow-sm ring-1 ring-black/5">
          {items.map((item) => (
            <li key={item.variantId} className="flex items-center gap-4 p-4">
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-secondary/20">
                {item.product.node.images?.edges?.[0]?.node && (
                  <img
                    src={item.product.node.images.edges[0].node.url}
                    alt={item.product.node.title}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#1e3a5f]">
                  {item.product.node.title}
                </p>
                {item.selectedOptions.length > 0 && (
                  <p className="text-xs text-gray-500">
                    {item.selectedOptions.map((o) => o.value).join(" • ")}
                  </p>
                )}
                <p className="mt-1 text-sm font-semibold text-[#1e3a5f]">
                  {item.price.currencyCode} {parseFloat(item.price.amount).toFixed(2)}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                    className="grid h-7 w-7 place-items-center rounded border border-gray-300 hover:bg-gray-50"
                    aria-label={t("checkout.decrease", "Restar")}
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="min-w-[24px] text-center text-sm font-bold">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                    className="grid h-7 w-7 place-items-center rounded border border-gray-300 hover:bg-gray-50"
                    aria-label={t("checkout.increase", "Sumar")}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => removeItem(item.variantId)}
                    className="ml-2 text-gray-400 hover:text-red-500"
                    aria-label={t("checkout.remove", "Eliminar")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm font-bold text-[#1e3a5f]">
                {item.price.currencyCode}{" "}
                {(parseFloat(item.price.amount) * item.quantity).toFixed(2)}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-[#1e3a5f]">
              {t("cartDrawer.total", "Total")}
            </span>
            <span className="text-xl font-extrabold text-[#1e3a5f]">
              {currency} {totalPrice.toFixed(2)}
            </span>
          </div>
          <Button
            onClick={handleCheckout}
            className="mt-4 w-full bg-[#1e3a5f] hover:bg-[#16294a]"
            size="lg"
            disabled={isLoading || isSyncing}
          >
            {isLoading || isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ExternalLink className="mr-2 h-4 w-4" />
                {t("cartDrawer.checkoutBtn", "Finaliza tu compra")}
              </>
            )}
          </Button>
        </div>
      </div>
    </main>
  );
}
