import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, Plus, Minus, ShoppingBag } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import cookieChoc from "@/assets/cookie-choc.jpg";
import cookiePb from "@/assets/cookie-pb.jpg";
import cookieSnicker from "@/assets/cookie-snicker.jpg";
import cookieBox from "@/assets/cookie-box.jpg";
import product1 from "@/assets/product-1.jpg";
import product2 from "@/assets/product-2.jpg";
import product3 from "@/assets/product-3.jpg";
import product4 from "@/assets/product-4.jpg";

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "Menu — Oys" },
      { name: "description", content: "Browse our full menu of classic cookies and cookie packs at Oys." },
    ],
  }),
  component: MenuPage,
});

interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  image: string;
}

const classicCookies: MenuItem[] = [
  { id: "c1", name: "Chocolate Chunk", price: 3.75, image: cookieChoc },
  { id: "c2", name: "Classic Oreo / Cookies 'N Cream", price: 3.75, image: product1 },
  { id: "c3", name: "Snickerdoodle", price: 3.75, image: cookieSnicker },
  { id: "c4", name: "M&M", price: 3.75, image: product2 },
  { id: "c5", name: "Sugar", price: 3.75, image: product3 },
  { id: "c6", name: "Double Chocolate Chunk", price: 3.75, image: product4 },
  { id: "c7", name: "Oatmeal Raisin", price: 3.75, image: cookiePb },
  { id: "c8", name: "Peanut Butter Chip", price: 3.75, image: cookiePb },
  { id: "c9", name: "Double Chocolate Mint", price: 3.75, image: cookieChoc },
  { id: "c10", name: "White Chocolate Macadamia", price: 3.75, image: product1 },
];

const cookiePacks: MenuItem[] = [
  { id: "p6", name: "6-Pack Cookies", price: 20.0, image: cookieBox },
  { id: "p9", name: "9-Pack Cookies", price: 28.0, image: cookieBox },
  { id: "p12", name: "12-Pack Cookies", price: 36.0, image: cookieBox },
];

function formatPrice(n: number) {
  return `$${n.toFixed(2)}`;
}

function MenuPage() {
  const [cart, setCart] = useState<CartItem[]>([]);

  const cartQty = cart.reduce((sum, item) => sum + item.qty, 0);

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1 }];
    });
  }

  function decrement(itemId: string) {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === itemId);
      if (existing && existing.qty > 1) {
        return prev.map((c) => (c.id === itemId ? { ...c, qty: c.qty - 1 } : c));
      }
      return prev.filter((c) => c.id !== itemId);
    });
  }

  function getQty(id: string) {
    return cart.find((c) => c.id === id)?.qty ?? 0;
  }

  return (
    <main className="min-h-screen bg-background pb-28">
      {/* Warm brown header */}
      <header
        className="px-5 pb-8 pt-12 text-cream"
        style={{ backgroundColor: "oklch(0.30 0.06 50)" }}
      >
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-cream/10"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1
            className="absolute left-1/2 -translate-x-1/2 text-sm font-bold uppercase tracking-[0.15em]"
            style={{ color: "oklch(0.94 0.018 75)" }}
          >
            Our Menu
          </h1>
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cream/10">
              <ShoppingBag className="h-5 w-5" style={{ color: "oklch(0.94 0.018 75)" }} />
            </div>
            {cartQty > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-cta text-[10px] font-bold text-cta-foreground">
                {cartQty}
              </span>
            )}
          </div>
        </div>
        <p
          className="mt-4 text-center text-sm font-medium"
          style={{ color: "oklch(0.85 0.02 60)" }}
        >
          Warm cookies baked fresh & delivered fast
        </p>
      </header>

      {/* Individual Classic Cookies */}
      <section className="px-5 pt-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-6 w-1 rounded-full bg-cta" />
          <h2 className="text-lg font-bold text-foreground">
            Individual Classic Cookies
          </h2>
        </div>
        <p className="mb-4 text-xs font-medium text-muted-foreground">
          $3.75 each — mix & match your favorites
        </p>

        <div className="grid grid-cols-2 gap-4">
          {classicCookies.map((item) => {
            const qty = getQty(item.id);
            return (
              <article
                key={item.id}
                className="relative overflow-hidden rounded-2xl bg-card p-3 shadow-sm ring-1 ring-border"
              >
                <div
                  className="aspect-square overflow-hidden rounded-xl"
                  style={{ backgroundColor: "oklch(0.90 0.015 70)" }}
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    width={512}
                    height={512}
                  />
                </div>
                <div className="mt-3">
                  <h3 className="text-sm font-bold leading-tight text-foreground">
                    {item.name}
                  </h3>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-extrabold text-primary">
                      {formatPrice(item.price)}
                    </span>
                  </div>
                </div>

                {qty === 0 ? (
                  <button
                    type="button"
                    onClick={() => addToCart(item)}
                    className="absolute bottom-3 right-3 grid h-8 w-8 place-items-center rounded-full bg-cta text-cta-foreground shadow-md transition hover:brightness-105"
                    aria-label={`Add ${item.name} to cart`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                ) : (
                  <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-primary px-2 py-1 shadow-md">
                    <button
                      type="button"
                      onClick={() => decrement(item.id)}
                      className="grid h-5 w-5 place-items-center rounded-full bg-primary-foreground/10 text-primary-foreground"
                      aria-label={`Remove one ${item.name}`}
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="min-w-[1rem] text-center text-xs font-bold text-primary-foreground">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => addToCart(item)}
                      className="grid h-5 w-5 place-items-center rounded-full bg-primary-foreground/10 text-primary-foreground"
                      aria-label={`Add another ${item.name}`}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* Cookie Packs */}
      <section className="px-5 pt-10">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-6 w-1 rounded-full bg-cta" />
          <h2 className="text-lg font-bold text-foreground">Cookie Packs</h2>
        </div>
        <p className="mb-4 text-xs font-medium text-muted-foreground">
          Perfect for sharing — or not
        </p>

        <div className="flex flex-col gap-4">
          {cookiePacks.map((item) => {
            const qty = getQty(item.id);
            return (
              <article
                key={item.id}
                className="flex items-center gap-4 overflow-hidden rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border"
              >
                <div
                  className="h-20 w-20 shrink-0 overflow-hidden rounded-xl"
                  style={{ backgroundColor: "oklch(0.90 0.015 70)" }}
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    width={256}
                    height={256}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-foreground">{item.name}</h3>
                  <p className="mt-0.5 text-sm font-extrabold text-primary">
                    {formatPrice(item.price)}
                  </p>
                </div>

                {qty === 0 ? (
                  <button
                    type="button"
                    onClick={() => addToCart(item)}
                    className="shrink-0 rounded-full bg-cta px-4 py-2 text-xs font-bold uppercase tracking-wider text-cta-foreground shadow-md transition hover:brightness-105"
                  >
                    Add to Cart
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 rounded-full bg-primary px-2 py-1.5 shadow-md">
                    <button
                      type="button"
                      onClick={() => decrement(item.id)}
                      className="grid h-6 w-6 place-items-center rounded-full bg-primary-foreground/10 text-primary-foreground"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-[1.25rem] text-center text-sm font-bold text-primary-foreground">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => addToCart(item)}
                      className="grid h-6 w-6 place-items-center rounded-full bg-primary-foreground/10 text-primary-foreground"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* Cart summary bar */}
      {cartQty > 0 && (
        <div className="fixed inset-x-0 bottom-20 z-40 px-5">
          <div className="mx-auto flex max-w-md items-center justify-between rounded-2xl bg-primary px-5 py-3.5 text-primary-foreground shadow-2xl">
            <div>
              <p className="text-xs font-medium text-primary-foreground/70">
                {cartQty} {cartQty === 1 ? "item" : "items"} in cart
              </p>
              <p className="text-sm font-bold">
                {formatPrice(cart.reduce((sum, item) => sum + item.price * item.qty, 0))}
              </p>
            </div>
            <button
              type="button"
              className="rounded-full bg-cta px-5 py-2 text-xs font-bold uppercase tracking-wider text-cta-foreground shadow-md"
            >
              Checkout
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
