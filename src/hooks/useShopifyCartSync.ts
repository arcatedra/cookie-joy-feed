import { useEffect } from "react";
import { useShopifyCartStore } from "@/stores/shopifyCartStore";

export function useShopifyCartSync() {
  const syncCart = useShopifyCartStore((s) => s.syncCart);
  useEffect(() => {
    syncCart();
    const onVis = () => {
      if (document.visibilityState === "visible") syncCart();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [syncCart]);
}
