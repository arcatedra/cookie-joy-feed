import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Lock,
  Cookie,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Truck,
  Zap,
  CheckCircle2,
  MapPin,
  ShoppingBag,
  Minus,
  Plus,
  Trash2,
} from "lucide-react";
import { useCart } from "@/lib/cart";
import { ZendaLogo } from "@/components/ZendaLogo";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Secure Checkout — ZENDA Cookies" },
      { name: "description", content: "Complete your cookie order securely." },
    ],
  }),
  component: CheckoutPage,
});

type StepKey = "address" | "payment" | "review";
type Shipping = "standard" | "express";
type PayMethod = "card" | "wallet";

function CheckoutPage() {
  const { items, total, setQty, remove, clear, count } = useCart();
  const navigate = useNavigate();

  const [openStep, setOpenStep] = useState<StepKey>("address");
  const [shipping, setShipping] = useState<Shipping>("standard");
  const [pay, setPay] = useState<PayMethod>("card");
  const [confirmed, setConfirmed] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [trackingId] = useState(
    () => `AMZ-GAL-${Math.floor(1000 + Math.random() * 9000)}`,
  );

  // Address form
  const [addr, setAddr] = useState({
    name: "",
    street: "",
    apt: "",
    city: "",
    zip: "",
    phone: "",
    makeDefault: true,
  });

  // Card form
  const [card, setCard] = useState({ number: "", exp: "", cvv: "" });

  const shippingCost = items.length === 0 ? 0 : shipping === "express" ? 4.99 : 0;
  const taxes = useMemo(() => Math.round(total * 0.08 * 100) / 100, [total]);
  const grandTotal = useMemo(
    () => Math.round((total + shippingCost + taxes) * 100) / 100,
    [total, shippingCost, taxes],
  );

  const fmt = (n: number) => `$${n.toFixed(2)}`;

  const handleConfirm = async () => {
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 1400));
    clear();
    setProcessing(false);
    setConfirmed(true);
  };

  // ============ Success screen ============
  if (confirmed) {
    return (
      <main className="min-h-screen bg-[#eaeded]">
        <MiniHeader />
        <div className="mx-auto max-w-2xl px-4 py-16">
          <div className="rounded-2xl bg-white p-8 text-center shadow-lg ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-500">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-12 w-12" strokeWidth={2.2} />
            </div>
            <h1 className="mt-5 text-2xl font-extrabold text-[#1a0f0a]">
              ¡Pedido Confirmado! <span className="text-3xl">🍪</span>
            </h1>
            <p className="mt-3 text-sm text-gray-600">
              Tus galletas se están horneando y van en camino.
            </p>
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs uppercase tracking-wider text-amber-800">
                Número de seguimiento
              </p>
              <p className="mt-1 font-mono text-lg font-bold text-[#1a0f0a]">
                #{trackingId}
              </p>
            </div>
            <button
              onClick={() => navigate({ to: "/" })}
              className="mt-7 w-full rounded-lg bg-amber-400 py-3 text-sm font-bold text-[#1a0f0a] shadow hover:bg-amber-300"
            >
              Volver a la tienda
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ============ Empty cart ============
  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-[#eaeded]">
        <MiniHeader />
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white shadow">
            <ShoppingBag className="h-9 w-9 text-[#1a0f0a]" />
          </div>
          <h1 className="mt-5 text-xl font-bold text-[#1a0f0a]">Tu carrito está vacío</h1>
          <p className="mt-2 text-sm text-gray-600">
            Agrega galletas para iniciar el pago.
          </p>
          <Link
            to="/"
            className="mt-6 inline-block rounded-lg bg-amber-400 px-6 py-3 text-sm font-bold text-[#1a0f0a] shadow hover:bg-amber-300"
          >
            Explorar galletas
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#eaeded]">
      <MiniHeader />

      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        <h1 className="mb-5 text-2xl font-extrabold text-[#1a0f0a] lg:text-3xl">
          Pago Seguro
        </h1>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          {/* ============ LEFT: Steps accordion ============ */}
          <div className="flex flex-col gap-4">
            {/* STEP 1 — Address */}
            <StepCard
              num={1}
              title="Dirección de Envío"
              open={openStep === "address"}
              onToggle={() => setOpenStep(openStep === "address" ? "review" : "address")}
              summary={
                addr.name && addr.city
                  ? `${addr.name} · ${addr.street}, ${addr.city} ${addr.zip}`
                  : undefined
              }
              icon={<MapPin className="h-5 w-5" />}
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field
                  label="Nombre completo"
                  value={addr.name}
                  onChange={(v) => setAddr({ ...addr, name: v })}
                  full
                />
                <Field
                  label="Dirección (calle)"
                  value={addr.street}
                  onChange={(v) => setAddr({ ...addr, street: v })}
                  full
                />
                <Field
                  label="Apartamento / Unidad"
                  value={addr.apt}
                  onChange={(v) => setAddr({ ...addr, apt: v })}
                />
                <Field
                  label="Ciudad"
                  value={addr.city}
                  onChange={(v) => setAddr({ ...addr, city: v })}
                />
                <Field
                  label="Código postal"
                  value={addr.zip}
                  onChange={(v) => setAddr({ ...addr, zip: v })}
                />
                <Field
                  label="Teléfono"
                  value={addr.phone}
                  onChange={(v) => setAddr({ ...addr, phone: v })}
                />
              </div>
              <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={addr.makeDefault}
                  onChange={(e) =>
                    setAddr({ ...addr, makeDefault: e.target.checked })
                  }
                  className="h-4 w-4 accent-amber-500"
                />
                Hacer esta mi dirección predeterminada
              </label>
              <button
                onClick={() => setOpenStep("payment")}
                className="mt-4 rounded-lg bg-amber-400 px-5 py-2 text-sm font-bold text-[#1a0f0a] shadow hover:bg-amber-300"
              >
                Usar esta dirección
              </button>
            </StepCard>

            {/* STEP 2 — Payment */}
            <StepCard
              num={2}
              title="Método de Pago"
              open={openStep === "payment"}
              onToggle={() => setOpenStep(openStep === "payment" ? "review" : "payment")}
              summary={
                pay === "card" && card.number
                  ? `Tarjeta •••• ${card.number.slice(-4)}`
                  : pay === "wallet"
                    ? "PayPal / Apple Pay"
                    : undefined
              }
              icon={<CreditCard className="h-5 w-5" />}
            >
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setPay("card")}
                  className={`flex items-center justify-between rounded-lg border-2 p-3 text-left transition ${
                    pay === "card"
                      ? "border-amber-500 bg-amber-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-[#1a0f0a]">
                    <CreditCard className="h-5 w-5" /> Tarjeta de Crédito / Débito
                  </span>
                  <span
                    className={`h-4 w-4 rounded-full border-2 ${
                      pay === "card"
                        ? "border-amber-500 bg-amber-500"
                        : "border-gray-300"
                    }`}
                  />
                </button>
                {pay === "card" && (
                  <div className="grid grid-cols-1 gap-3 rounded-lg bg-gray-50 p-3 md:grid-cols-3">
                    <div className="md:col-span-3">
                      <Field
                        label="Número de tarjeta"
                        value={card.number}
                        onChange={(v) =>
                          setCard({ ...card, number: v.replace(/\D/g, "").slice(0, 19) })
                        }
                        placeholder="1234 5678 9012 3456"
                        full
                      />
                    </div>
                    <Field
                      label="Vencimiento (MM/AA)"
                      value={card.exp}
                      onChange={(v) => setCard({ ...card, exp: v.slice(0, 5) })}
                      placeholder="08/28"
                    />
                    <Field
                      label="CVV"
                      value={card.cvv}
                      onChange={(v) =>
                        setCard({ ...card, cvv: v.replace(/\D/g, "").slice(0, 4) })
                      }
                      placeholder="123"
                    />
                  </div>
                )}

                <button
                  onClick={() => setPay("wallet")}
                  className={`flex items-center justify-between rounded-lg border-2 p-3 text-left transition ${
                    pay === "wallet"
                      ? "border-amber-500 bg-amber-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-[#1a0f0a]">
                    <Zap className="h-5 w-5 text-emerald-600" /> PayPal / Apple Pay
                  </span>
                  <span className="text-xs font-bold text-emerald-600">RÁPIDO</span>
                </button>
              </div>
              <button
                onClick={() => setOpenStep("review")}
                className="mt-4 rounded-lg bg-amber-400 px-5 py-2 text-sm font-bold text-[#1a0f0a] shadow hover:bg-amber-300"
              >
                Continuar
              </button>
            </StepCard>

            {/* STEP 3 — Review */}
            <StepCard
              num={3}
              title="Revisión y Logística"
              open={openStep === "review"}
              onToggle={() => setOpenStep(openStep === "review" ? "address" : "review")}
              icon={<Truck className="h-5 w-5" />}
            >
              <ul className="flex flex-col divide-y divide-gray-100 rounded-lg border border-gray-200">
                {items.map((it) => (
                  <li key={it.id} className="flex items-center gap-3 p-3">
                    <img
                      src={it.image}
                      alt={it.name}
                      className="h-14 w-14 rounded-md object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#1a0f0a]">
                        {it.name}
                      </p>
                      <p className="text-xs text-gray-500">{fmt(it.price)} c/u</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <button
                          onClick={() => setQty(it.id, it.qty - 1)}
                          className="grid h-6 w-6 place-items-center rounded border border-gray-300 hover:bg-gray-50"
                          aria-label="Reducir"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="min-w-[20px] text-center text-sm font-bold">
                          {it.qty}
                        </span>
                        <button
                          onClick={() => setQty(it.id, it.qty + 1)}
                          className="grid h-6 w-6 place-items-center rounded border border-gray-300 hover:bg-gray-50"
                          aria-label="Aumentar"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => remove(it.id)}
                          className="ml-2 text-gray-400 hover:text-red-500"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-[#1a0f0a]">
                      {fmt(it.price * it.qty)}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="mt-4">
                <p className="mb-2 text-sm font-bold text-[#1a0f0a]">Tipo de envío</p>
                <div className="flex flex-col gap-2">
                  <ShippingOption
                    active={shipping === "standard"}
                    onClick={() => setShipping("standard")}
                    icon={<Truck className="h-5 w-5" />}
                    title="Envío Estándar"
                    sub="Llega en 3 días"
                    price="GRATIS"
                    priceClass="text-emerald-600"
                  />
                  <ShippingOption
                    active={shipping === "express"}
                    onClick={() => setShipping("express")}
                    icon={<Zap className="h-5 w-5 text-amber-500" />}
                    title="Envío Express Dulce"
                    sub="Llega HOY mismo en unas horas"
                    price="+$4.99"
                    priceClass="text-[#1a0f0a]"
                  />
                </div>
              </div>
            </StepCard>
          </div>

          {/* ============ RIGHT: Order summary ============ */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-2xl bg-white p-5 shadow-lg ring-1 ring-black/5">
              <button
                onClick={handleConfirm}
                disabled={processing}
                className="w-full rounded-lg bg-gradient-to-b from-amber-400 to-amber-500 py-3.5 text-sm font-extrabold text-[#1a0f0a] shadow-md transition hover:from-amber-300 hover:to-amber-400 disabled:opacity-60"
              >
                {processing ? "Procesando…" : "Confirmar y Pagar Pedido"}
              </button>

              <p className="mt-3 text-center text-[11px] text-gray-500">
                Al confirmar tu pedido, aceptas los términos de servicio de la tienda.
              </p>

              <div className="my-4 h-px bg-gray-200" />

              <h2 className="text-base font-bold text-[#1a0f0a]">Resumen del Pedido</h2>
              <div className="mt-3 space-y-1.5 text-sm">
                <SummaryRow label={`Productos (${count})`} value={fmt(total)} />
                <SummaryRow
                  label="Envío y manejo"
                  value={shippingCost === 0 ? "GRATIS" : fmt(shippingCost)}
                  valueClass={shippingCost === 0 ? "text-emerald-600 font-semibold" : ""}
                />
                <SummaryRow label="Impuestos estimados" value={fmt(taxes)} />
              </div>

              <div className="my-3 h-px bg-gray-200" />

              <div className="flex items-baseline justify-between">
                <span className="text-base font-bold text-red-700">Total del Pedido:</span>
                <span className="text-2xl font-extrabold text-red-700">
                  {fmt(grandTotal)}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
                <Lock className="h-3 w-3" /> Pago 100% seguro y cifrado
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

// ============ Minimal header (Amazon-style focus mode) ============
function MiniHeader() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-6">
        <Link to="/" className="flex items-center gap-3" aria-label="ZENDA">
          <ZendaLogo
            size={34}
            showTagline
            nameClassName="text-lg font-bold tracking-[0.22em] text-[#1a0f0a]"
            taglineClassName="text-[7px] tracking-[0.28em] text-[#4A3525]/70"
          />
          <span className="ml-1 border-l border-gray-300 pl-3 text-sm font-semibold text-gray-500">Checkout</span>
        </Link>
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
          <Lock className="h-3.5 w-3.5" /> Pago Seguro
        </div>
      </div>
    </header>
  );
}

// ============ Step card ============
function StepCard({
  num,
  title,
  open,
  onToggle,
  summary,
  icon,
  children,
}: {
  num: number;
  title: string;
  open: boolean;
  onToggle: () => void;
  summary?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-gray-50"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#1a0f0a] text-sm font-bold text-amber-300">
          {num}
        </span>
        <div className="flex-1">
          <h2 className="flex items-center gap-2 text-base font-bold text-[#1a0f0a]">
            {icon} {title}
          </h2>
          {!open && summary && (
            <p className="mt-0.5 truncate text-xs text-gray-500">{summary}</p>
          )}
        </div>
        {open ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>
      {open && <div className="border-t border-gray-100 px-5 py-5">{children}</div>}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  full,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  full?: boolean;
}) {
  return (
    <label className={`block text-sm ${full ? "md:col-span-2" : ""}`}>
      <span className="mb-1 block text-xs font-semibold text-gray-700">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
      />
    </label>
  );
}

function ShippingOption({
  active,
  onClick,
  icon,
  title,
  sub,
  price,
  priceClass,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  sub: string;
  price: string;
  priceClass?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg border-2 p-3 text-left transition ${
        active
          ? "border-amber-500 bg-amber-50"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <span
        className={`h-4 w-4 shrink-0 rounded-full border-2 ${
          active ? "border-amber-500 bg-amber-500" : "border-gray-300"
        }`}
      />
      <span className="shrink-0">{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-bold text-[#1a0f0a]">{title}</p>
        <p className="text-xs text-gray-500">{sub}</p>
      </div>
      <p className={`text-sm font-bold ${priceClass ?? ""}`}>{price}</p>
    </button>
  );
}

function SummaryRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between text-gray-700">
      <span>{label}:</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
