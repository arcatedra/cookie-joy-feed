import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Minus, Plus, Trash2, ShoppingBag, CreditCard, Lock } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart — Oys" },
      { name: "description", content: "Review your cookies and check out securely." },
    ],
  }),
  component: CartPage,
});

type Step = "cart" | "checkout" | "success";

function CartPage() {
  const { t, i18n } = useTranslation();
  const { items, count, total, setQty, remove, clear } = useCart();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("cart");
  const [processing, setProcessing] = useState(false);

  const shipping = items.length === 0 ? 0 : total >= 25 ? 0 : 3.99;
  const grand = total + shipping;

  const onPay = async () => {
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 1200));
    clear();
    setProcessing(false);
    setStep("success");
  };

  return (
    <main className="min-h-screen bg-background pb-32 text-foreground">
      <header className="flex items-center justify-between bg-primary px-5 pt-6 pb-5 text-primary-foreground rounded-b-3xl shadow-lg">
        <Link to="/" aria-label={t("common.back")} className="grid h-9 w-9 place-items-center rounded-full bg-primary-foreground/10">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-base font-bold uppercase tracking-[0.15em]">
          {step === "success" ? t("cart.orderConfirmed") : step === "checkout" ? t("cart.checkout") : t("cart.title")}
        </h1>
        <LanguageSwitcher />
      </header>

      {step === "cart" && (
        <>
          {items.length === 0 ? (
            <div className="mt-16 flex flex-col items-center px-6 text-center">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-cream">
                <ShoppingBag className="h-8 w-8 text-primary" />
              </div>
              <h2 className="mt-4 text-lg font-bold">{t("cart.empty")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("cart.emptyDesc")}</p>
              <Link to="/menu" className="mt-6 rounded-full bg-cta px-6 py-3 text-sm font-bold text-cta-foreground shadow">
                {t("cart.browseMenu")}
              </Link>
            </div>
          ) : (
            <section className="px-5 pt-5">
              <ul className="flex flex-col gap-3">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm ring-1 ring-border">
                    <img src={item.image} alt={item.name} className="h-16 w-16 rounded-xl object-cover" />
                    <div className="flex-1 min-w-0">
                      <h3 className="truncate text-sm font-bold">{item.name}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">{formatPrice(item.price, i18n.language)}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <button onClick={() => setQty(item.id, item.qty - 1)} aria-label={t("common.remove")} className="grid h-7 w-7 place-items-center rounded-full bg-muted">
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-[20px] text-center text-sm font-bold">{item.qty}</span>
                        <button onClick={() => setQty(item.id, item.qty + 1)} aria-label={t("common.add")} className="grid h-7 w-7 place-items-center rounded-full bg-muted">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-sm font-bold text-primary">{formatPrice(item.price * item.qty, i18n.language)}</span>
                      <button onClick={() => remove(item.id)} aria-label={t("common.remove")} className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-5 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
                <Row label={t("cart.subtotal")} value={formatPrice(total, i18n.language)} />
                <Row label={t("cart.shipping")} value={shipping === 0 ? t("cart.free") : formatPrice(shipping, i18n.language)} />
                <div className="my-3 h-px bg-border" />
                <Row label={t("cart.total")} value={formatPrice(grand, i18n.language)} bold />
              </div>

              <button
                onClick={() => setStep("checkout")}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-cta py-3.5 text-sm font-bold text-cta-foreground shadow-lg active:scale-[0.98] transition"
              >
                <CreditCard className="h-4 w-4" />
                {t("cart.proceedCheckout")} • {formatPrice(grand, i18n.language)}
              </button>
            </section>
          )}
        </>
      )}

      {step === "checkout" && (
        <section className="px-5 pt-5">
          <div className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t("cart.payMethod")}</h2>
            <div className="mt-3 flex flex-col gap-2">
              <PayOption label="Apple Pay" sub={t("cart.fastSecure")} active />
              <PayOption label="Credit / Debit Card" sub="Visa, Mastercard, Amex" />
              <PayOption label="Google Pay" sub={t("cart.fastSecure")} />
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t("cart.orderSummary")}</h2>
            <div className="mt-3">
              <Row label={t("cart.items", { count })} value={formatPrice(total, i18n.language)} />
              <Row label={t("cart.shipping")} value={shipping === 0 ? t("cart.free") : formatPrice(shipping, i18n.language)} />
              <div className="my-3 h-px bg-border" />
              <Row label={t("cart.total")} value={formatPrice(grand, i18n.language)} bold />
            </div>
          </div>

          <button
            onClick={onPay}
            disabled={processing}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg disabled:opacity-60"
          >
            <Lock className="h-4 w-4" />
            {processing ? t("cart.processing") : `${t("cart.payNow")} • ${formatPrice(grand, i18n.language)}`}
          </button>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">{t("cart.demoNote")}</p>
        </section>
      )}

      {step === "success" && (
        <section className="mt-16 flex flex-col items-center px-6 text-center">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-cta/20 text-cta">
            <ShoppingBag className="h-9 w-9" />
          </div>
          <h2 className="mt-4 text-xl font-bold">{t("cart.thanks")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("cart.thanksDesc")}</p>
          <button
            onClick={() => navigate({ to: "/" })}
            className="mt-6 rounded-full bg-cta px-6 py-3 text-sm font-bold text-cta-foreground shadow"
          >
            {t("cart.backHome")}
          </button>
        </section>
      )}
    </main>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1 text-sm ${bold ? "font-bold text-foreground" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span className={bold ? "text-primary" : ""}>{value}</span>
    </div>
  );
}

function PayOption({ label, sub, active }: { label: string; sub: string; active?: boolean }) {
  return (
    <button
      type="button"
      className={`flex items-center justify-between rounded-xl px-4 py-3 text-left transition ${
        active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/70"
      }`}
    >
      <div>
        <p className="text-sm font-bold">{label}</p>
        <p className={`text-[11px] ${active ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{sub}</p>
      </div>
      <span className={`h-4 w-4 rounded-full border-2 ${active ? "border-primary-foreground bg-primary-foreground" : "border-muted-foreground/40"}`} />
    </button>
  );
}
