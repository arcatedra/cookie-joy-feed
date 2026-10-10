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
import { useCart, deriveCartItemNameKey } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { createCartCheckout } from "@/lib/cart-checkout.functions";
import { HazorexLogo } from "@/components/HazorexLogo";
import { COOKIE_MINIMUM_CENTS } from "@/lib/cookie-order-rules";
import i18n from "@/i18n";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyCredit } from "@/lib/wallet-credits.functions";
import { TipSelector } from "@/components/TipSelector";
import { Button } from "@/components/ui/button";
import { cancelPendingCheckout } from "@/lib/checkout-cancel.functions";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: i18n.t("cartPage.metaTitle") },
      { name: "description", content: i18n.t("cartPage.metaDesc") },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: i18n.t("cartPage.metaTitle") },
      { property: "og:description", content: i18n.t("cartPage.metaDesc") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
  const checkout = useServerFn(createCartCheckout);
  const cancelCheckout = useServerFn(cancelPendingCheckout);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const fetchCredit = useServerFn(getMyCredit);
  const { data: credit } = useQuery({ queryKey: ["my-credit"], queryFn: () => fetchCredit(), enabled: !!user });
  const [propina, setPropina] = useState(0);
  const [usarSaldo, setUsarSaldo] = useState(true);
  const [confirmedTotal, setConfirmedTotal] = useState<number | null>(null);
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
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const checkoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
  }, [user, email]);

  const shippingCost = 0;
  const subtotal = cart.total;
  const missingCents = Math.max(0, COOKIE_MINIMUM_CENTS - Math.round(subtotal * 100));
  const gross = subtotal + shippingCost + propina;
  const discount = usarSaldo ? Math.min(Math.max(0, Number(credit?.balance ?? 0)), Math.max(gross - 1, 0), subtotal + shippingCost) : 0;
  const total = confirmedTotal ?? Math.round((gross - discount) * 100) / 100;

  const canCheckout =
    cart.count > 0 &&
    missingCents === 0 &&
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
      const res = await checkout({
        data: {
          items: cart.items.map((it) => ({
            id: it.id,
            name: (() => {
              const k = it.nameKey ?? deriveCartItemNameKey(it.id);
              return k && i18n.exists(k) ? t(k) : it.name;
            })(),
            price: it.price,
            qty: it.qty,
            image: it.image?.startsWith("http") ? it.image : undefined,
          })),
          address,
          shipping: "standard",
          propina,
          usarSaldo,
          locale: i18n.language.startsWith("en") ? "en" : "es",
        },
      });
      setPendingOrderId(res.pedidoId);
      setClientSecret(res.clientSecret);
      setConfirmedTotal(res.totalEstimado);
      setTimeout(() => {
        checkoutRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : t("cartPage.checkoutError"));
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
          <h1 className="mt-5 text-xl font-bold text-foreground">{t("cartPage.empty")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("cartPage.emptyDesc")}
          </p>
          <Link
            to="/shop"
            className="mt-6 inline-block rounded-full bg-cta px-6 py-3 text-sm font-bold uppercase tracking-wider text-cta-foreground shadow"
          >
            {t("cartPage.goShop")}
          </Link>

        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-32">
      <Header />
      <div className="mx-auto max-w-3xl px-5 py-6">
        <h1 className="text-2xl font-extrabold text-foreground">{t("cartPage.title")}</h1>

        <section className="mt-5 divide-y divide-border rounded-2xl bg-card ring-1 ring-border">
          {cart.items.map((it) => {
            const resolvedKey = it.nameKey ?? deriveCartItemNameKey(it.id);
            const displayName = resolvedKey && i18n.exists(resolvedKey) ? t(resolvedKey) : it.name;
            return (
            <div key={it.id} className="flex items-center gap-3 p-3">
              <img
                src={it.image}
                alt={displayName}
                className="h-16 w-16 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-bold text-foreground">{displayName}</h3>
                <p className="text-xs text-muted-foreground">
                  ${it.price.toFixed(2)} {t("cartPage.each")}
                </p>
                <div className="mt-2 inline-flex items-center overflow-hidden rounded-full border border-border">
                  <button
                    type="button"
                    onClick={() => cart.setQty(it.id, it.qty - 1)}
                    className="grid h-7 w-7 place-items-center text-foreground hover:bg-muted"
                    aria-label={t("cartPage.decrease")}
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
                    aria-label={t("cartPage.increase")}
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
                  aria-label={t("cartPage.remove")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
          })}
        </section>

        {!clientSecret && (
          <>
            <section className="mt-6 space-y-3 rounded-2xl bg-card p-4 ring-1 ring-border">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                {t("cartPage.shippingInfo")}
              </h2>
              <Input
                label={t("cartPage.email")}
                type="email"
                value={email}
                onChange={setEmail}
                placeholder={t("cartPage.emailPh")}
              />
              <Input
                label={t("cartPage.fullName")}
                value={address.name}
                onChange={(v) => setAddress({ ...address, name: v })}
              />
              <Input
                label={t("cartPage.street")}
                value={address.street}
                onChange={(v) => setAddress({ ...address, street: v })}
              />
              <Input
                label={t("cartPage.apt")}
                value={address.apt}
                onChange={(v) => setAddress({ ...address, apt: v })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={t("cartPage.city")}
                  value={address.city}
                  onChange={(v) => setAddress({ ...address, city: v })}
                />
                <Input
                  label={t("cartPage.zip")}
                  value={address.zip}
                  onChange={(v) => setAddress({ ...address, zip: v })}
                />
              </div>
              <Input
                label={t("cartPage.phone")}
                value={address.phone}
                onChange={(v) => setAddress({ ...address, phone: v })}
              />
            </section>

            <section className="mt-4 rounded-2xl bg-card p-4 ring-1 ring-border">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                {t("cartPage.shipping")}
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">{t("deliveryPromise")}</p>
            </section>
            <div className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">{t("deliveryPromise")}</p>
              <TipSelector value={propina} onChange={setPropina} />
              {Number(credit?.balance ?? 0) > 0 && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={usarSaldo} onChange={(e) => setUsarSaldo(e.target.checked)} />{t("credit.use", { amount: Number(credit?.balance ?? 0).toFixed(2) })}</label>}
            </div>
          </>
        )}

        <section className="mt-4 space-y-1 rounded-2xl bg-card p-4 ring-1 ring-border text-sm">
          <Row label={t("cartPage.subtotal")} value={`$${subtotal.toFixed(2)}`} />
          <Row
            label={t("cartPage.shipping")}
            value={t("cartPage.free")}
          />
          <Row label={t("tips.title")} value={`$${propina.toFixed(2)}`} />
          {discount > 0 && <Row label={t("credit.discount")} value={`-$${discount.toFixed(2)}`} />}
          <div className="mt-2 flex items-baseline justify-between border-t border-border pt-3">
            <span className="text-base font-bold text-foreground">{t("cartPage.total")}</span>
            <span className="text-2xl font-extrabold text-primary">
              ${total.toFixed(2)}
            </span>
          </div>
        </section>



        {missingCents > 0 && !clientSecret && <p role="status" className="mt-4 text-sm font-semibold text-destructive">{t("cartPage.minimum", { missing: (missingCents / 100).toFixed(2), defaultValue: "Pedido mínimo $12 — te faltan ${{missing}}" })}</p>}
        {!clientSecret && (
          <Button
            type="button"
            onClick={startCheckout}
            disabled={!canCheckout || loadingCheckout}
            className="mt-5 w-full rounded-full bg-cta px-6 py-4 text-sm font-bold uppercase tracking-wider text-cta-foreground shadow-md transition hover:brightness-105 disabled:opacity-50"
          >
            {loadingCheckout
              ? t("cartPage.preparing")
              : t("cartPage.pay", { amount: `$${total.toFixed(2)}` })}
          </Button>
        )}

        {!canCheckout && cart.count > 0 && !clientSecret && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {t("cartPage.completeForm")}
          </p>
        )}

        {clientSecret && checkoutOptions && (
          <section ref={checkoutRef} className="mt-6 overflow-hidden rounded-2xl bg-card ring-1 ring-border">
            <EmbeddedCheckoutProvider stripe={getStripe()} options={checkoutOptions}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
            <Button variant="outline" className="m-4" disabled={loadingCheckout} onClick={async () => {
              if (!pendingOrderId) return;
              setLoadingCheckout(true);
              try { const result = await cancelCheckout({ data: { kind: "cookie", orderId: pendingOrderId } }); if (result.cancelled) { setClientSecret(null); setConfirmedTotal(null); setPendingOrderId(null); } }
              catch (error) { toast.error(error instanceof Error ? error.message : t("cartPage.checkoutError")); }
              finally { setLoadingCheckout(false); }
            }}>{t("common.back")}</Button>
          </section>
        )}

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          {t("cartPage.securedBy")}
        </p>

      </div>
    </main>
  );
}

function Header() {
  const { t } = useTranslation();
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
        <Link
          to="/shop"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted"
          aria-label={t("cartPage.back")}
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
