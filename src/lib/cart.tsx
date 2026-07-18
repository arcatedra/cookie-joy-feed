import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export interface CartItem {
  id: string;
  name: string;
  nameKey?: string;
  price: number;
  image: string;
  qty: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  total: number;
  hydrated: boolean;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "origen.cart.v1";

/**
 * Derive an i18n key for a cart item's display name from its stable id.
 * Used to migrate legacy cart entries persisted before `nameKey` was saved,
 * so /cart translates names consistently with /shop, /menu, /best-sellers.
 */
const REEL_SLUG_KEY_MAP: Record<string, string> = {
  "p-mm": "reels.items.mm.product",
  "p-cchunk": "reels.items.cchunk.product",
  "p-oatmeal": "reels.items.oatmeal.product",
  "p-snicker": "reels.items.snicker.product",
  "p-triple": "reels.items.triple.product",
  "p-mint": "reels.items.mint.product",
  "p-pista": "reels.items.pista.product",
  "p-pb": "reels.items.pb.product",
  "p-cc": "reels.items.cookiescream.product",
  "p-doublechoc": "reels.items.nutella.product",
};

export function deriveCartItemNameKey(id: string): string | undefined {
  if (!id) return undefined;
  const cookieMatch = id.match(/^(?:shop-)?(c\d{1,2})$/);
  if (cookieMatch) return `cookies.${cookieMatch[1]}.name`;
  const packMatch = id.match(/^(p\d{1,2})$/);
  if (packMatch) return `packs.${packMatch[1]}.name`;
  const sliderMatch = id.match(/^slider-(.+)$/);
  if (sliderMatch) return deriveCartItemNameKey(sliderMatch[1]);
  const reelMatch = id.match(/^reel-(.+)$/);
  if (reelMatch) return REEL_SLUG_KEY_MAP[reelMatch[1]];
  return undefined;
}

function migrateItems(items: CartItem[]): CartItem[] {
  // Prefer the nameKey derived from the stable id when available — it fixes
  // legacy carts where a stale/incorrect nameKey was persisted (e.g. a
  // `reel-p-mm` line stored with the Chocolate Chunk key from an older build).
  return items.map((it) => {
    const derived = deriveCartItemNameKey(it.id);
    return { ...it, nameKey: derived ?? it.nameKey };
  });
}

function readStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? migrateItems(parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  // Lazy init reads localStorage synchronously on the client so the first
  // client render already reflects the persisted cart. On SSR it returns [].
  const [items, setItems] = useState<CartItem[]>(() => readStorage());
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(typeof window !== "undefined");

  // Belt-and-suspenders: after mount, if SSR produced [] but storage has data,
  // reconcile once. Marks hydration complete before the save effect fires.
  useEffect(() => {
    if (!hydratedRef.current) {
      const stored = readStorage();
      if (stored.length > 0) setItems(stored);
      hydratedRef.current = true;
    }
    setHydrated(true);
  }, []);

  // Persist changes — but never before hydration completes, to avoid
  // clobbering existing storage with the initial [] state.
  useEffect(() => {
    if (!hydratedRef.current) return;
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      }
    } catch {
      /* ignore */
    }
  }, [items]);

  // Sync across tabs/windows.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      try {
        const next = e.newValue ? JSON.parse(e.newValue) : [];
        if (Array.isArray(next)) setItems(next);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((a, b) => a + b.qty, 0);
    const total = items.reduce((a, b) => a + b.qty * b.price, 0);
    return {
      items,
      count,
      total,
      hydrated,
      add: (item, qty = 1) =>
        setItems((prev) => {
          const withKey: Omit<CartItem, "qty"> = {
            ...item,
            nameKey: item.nameKey ?? deriveCartItemNameKey(item.id),
          };
          const i = prev.findIndex((p) => p.id === withKey.id);
          if (i >= 0) {
            const next = [...prev];
            // Overwrite metadata with the authoritative incoming values so a
            // stale/corrupt legacy line can't keep showing the wrong product
            // name/image while quantity increments.
            next[i] = {
              ...next[i],
              name: withKey.name,
              nameKey: withKey.nameKey,
              price: withKey.price,
              image: withKey.image,
              qty: next[i].qty + qty,
            };
            return next;
          }
          return [...prev, { ...withKey, qty }];
        }),
      remove: (id) => setItems((prev) => prev.filter((p) => p.id !== id)),
      setQty: (id, qty) =>
        setItems((prev) => {
          if (qty <= 0) return prev.filter((p) => p.id !== id);
          return prev.map((p) => (p.id === id ? { ...p, qty } : p));
        }),
      clear: () => setItems([]),
    };
  }, [items, hydrated]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
