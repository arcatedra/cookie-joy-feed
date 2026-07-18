import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { createCartCheckout } from "@/lib/cart-checkout.functions";
import { HazorexLogo } from "@/components/HazorexLogo";
import i18n from "@/i18n";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: i18n.t("cartPage.metaTitle") },
      { name: "description", content: i18n.t("cartPage.metaDesc") },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

let _stripePromise: Promise<Stripe | null> | null = null;
function getStripe() {
  if (!_stripePromise) {
    const pk = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;
    _stripePromise = pk ? loadStripe(pk) : Promise.resolve(null);
  }
  return _stripePromise;
}

interface AddressForm {
  name: string;
  street: string;
  apt: string;
  city: string;
  zip: string;
  phone: string;
  country: string;
}

function CartPage() {
  const cart = useCart();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [address, setAddress] = useState<AddressForm>({
    name: "",
    street: "",
    apt: "",
    city: "",
    zip: "",
    phone: "",
    country: "US",
  });
  const [shipping, setShipping] = useState<"standard" | "express">("standard");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const checkoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
  }, [user, email]);

  const shippingCost = shipping === "express" ? 4.99 : 0;
  const subtotal = cart.total;
  const total = subtotal + shippingCost;

  const canCheckout =
    cart.count > 0 &&
    /.+@.+\..+/.test(email) &&
    address.name.length >= 2 &&
    address.street.length >= 2 &&
    address.city.length >= 1 &&
    address.zip.length >= 2 &&
    address.phone.length >= 4;

  async function startCheckout() {
    if (!canCheckout || loadingCheckout) return;
    setLoadingCheckout(true);
    try {
      const res = await createCartCheckout({
        data: {
          items: cart.items.map((it) => ({
            id: it.id,
            name: it.name,
            price: it.price,
            qty: it.qty,
            image: it.image?.startsWith("http") ? it.image : undefined,
          })),
          email,
          address,
          shipping,
        },
      });
      setClientSecret(res.clientSecret);
      setTimeout(() => {
        checkoutRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "No se pudo iniciar el pago");
    } finally {
      setLoadingCheckout(false);
    }
  }

  const checkoutOptions = useMemo(
    () => (clientSecret ? { clientSecret } : null),
    [clientSecret],
  );

  if (cart.count === 0 && !clientSecret) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-md px-5 py-16 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-muted">
            <ShoppingBag className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="mt-5 text-xl font-bold text-foreground">Tu carrito está vacío</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Explora nuestro catálogo y agrega galletas para empezar.
          </p>
          <Link
            to="/shop"
            className="mt-6 inline-block rounded-full bg-cta px-6 py-3 text-sm font-bold uppercase tracking-wider text-cta-foreground shadow"
          >
            Ir a la tienda
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-32">
      <Header />
      <div className="mx-auto max-w-3xl px-5 py-6">
        <h1 className="text-2xl font-extrabold text-foreground">Tu carrito</h1>

        <section className="mt-5 divide-y divide-border rounded-2xl bg-card ring-1 ring-border">
          {cart.items.map((it) => (
            <div key={it.id} className="flex items-center gap-3 p-3">
              <img
                src={it.image}
                alt={it.name}
                className="h-16 w-16 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-bold text-foreground">{it.name}</h3>
                <p className="text-xs text-muted-foreground">
                  ${it.price.toFixed(2)} c/u
                </p>
                <div className="mt-2 inline-flex items-center overflow-hidden rounded-full border border-border">
                  <button
                    type="button"
                    onClick={() => cart.setQty(it.id, it.qty - 1)}
                    className="grid h-7 w-7 place-items-center text-foreground hover:bg-muted"
                    aria-label="disminuir"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="min-w-[2ch] px-2 text-center text-xs font-bold">
                    {it.qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => cart.setQty(it.id, it.qty + 1)}
                    className="grid h-7 w-7 place-items-center text-foreground hover:bg-muted"
                    aria-label="aumentar"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-sm font-bold text-foreground">
                  ${(it.price * it.qty).toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => cart.remove(it.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </section>

        {!clientSecret && (
          <>
            <section className="mt-6 space-y-3 rounded-2xl bg-card p-4 ring-1 ring-border">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Datos de envío
              </h2>
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="tu@email.com"
              />
              <Input
                label="Nombre completo"
                value={address.name}
                onChange={(v) => setAddress({ ...address, name: v })}
              />
              <Input
                label="Calle y número"
                value={address.street}
                onChange={(v) => setAddress({ ...address, street: v })}
              />
              <Input
                label="Apto / Suite (opcional)"
                value={address.apt}
                onChange={(v) => setAddress({ ...address, apt: v })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Ciudad"
                  value={address.city}
                  onChange={(v) => setAddress({ ...address, city: v })}
                />
                <Input
                  label="ZIP"
                  value={address.zip}
                  onChange={(v) => setAddress({ ...address, zip: v })}
                />
              </div>
              <Input
                label="Teléfono"
                value={address.phone}
                onChange={(v) => setAddress({ ...address, phone: v })}
              />
            </section>

            <section className="mt-4 rounded-2xl bg-card p-4 ring-1 ring-border">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Envío
              </h2>
              <div className="mt-3 space-y-2">
                <ShippingOption
                  checked={shipping === "standard"}
                  onChange={() => setShipping("standard")}
                  label="Estándar (3-5 días)"
                  price="Gratis"
                />
                <ShippingOption
                  checked={shipping === "express"}
                  onChange={() => setShipping("express")}
                  label="Exprés (1-2 días)"
                  price="$4.99"
                />
              </div>
            </section>
          </>
        )}

        <section className="mt-4 space-y-1 rounded-2xl bg-card p-4 ring-1 ring-border text-sm">
          <Row label="Subtotal" value={`$${subtotal.toFixed(2)}`} />
          <Row
            label="Envío"
            value={shippingCost === 0 ? "Gratis" : `$${shippingCost.toFixed(2)}`}
          />
          <div className="mt-2 flex items-baseline justify-between border-t border-border pt-3">
            <span className="text-base font-bold text-foreground">Total</span>
            <span className="text-2xl font-extrabold text-primary">
              ${total.toFixed(2)}
            </span>
          </div>
        </section>

        {!clientSecret && (
          <button
            type="button"
            onClick={startCheckout}
            disabled={!canCheckout || loadingCheckout}
            className="mt-5 w-full rounded-full bg-cta px-6 py-4 text-sm font-bold uppercase tracking-wider text-cta-foreground shadow-md transition hover:brightness-105 disabled:opacity-50"
          >
            {loadingCheckout ? "Preparando pago…" : `Pagar $${total.toFixed(2)} con Stripe`}
          </button>
        )}

        {!canCheckout && cart.count > 0 && !clientSecret && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Completa email y datos de envío para continuar.
          </p>
        )}

        {clientSecret && checkoutOptions && (
          <section ref={checkoutRef} className="mt-6 overflow-hidden rounded-2xl bg-card ring-1 ring-border">
            <EmbeddedCheckoutProvider stripe={getStripe()} options={checkoutOptions}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </section>
        )}

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Pagos procesados de forma segura por Stripe.
        </p>
      </div>
    </main>
  );
}

function Header() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
        <Link
          to="/shop"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted"
          aria-label="volver"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <Link to="/" aria-label="HAZOREX">
          <HazorexLogo size={26} />
        </Link>
        <span className="h-9 w-9" />
      </div>
    </header>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
      />
    </label>
  );
}

function ShippingOption({
  checked,
  onChange,
  label,
  price,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  price: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 text-sm ${
        checked ? "border-primary bg-primary/5" : "border-border"
      }`}
    >
      <span className="flex items-center gap-3">
        <input
          type="radio"
          checked={checked}
          onChange={onChange}
          className="h-4 w-4 accent-primary"
        />
        {label}
      </span>
      <span className="font-bold text-foreground">{price}</span>
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
