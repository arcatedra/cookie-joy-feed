import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Clock, Loader2, Minus, Plus, Search, Store } from "lucide-react";
import { getPublicStore } from "@/lib/store-public.functions";
import { isStoreOpen, todayHoursLabel } from "@/lib/store";
import { getPricingConfig } from "@/lib/pricing.functions";
import { getMyCredit } from "@/lib/wallet-credits.functions";
import { getMyCliente } from "@/lib/clientes.functions";
import { createStoreCheckout } from "@/lib/store-checkout.functions";
import {
  cartWeightLb,
  availableDeliveryDates,
  tierForSubtotal,
  weightFeeCents,
  processingFeeCents,
  DEFAULT_PRICING,
} from "@/lib/pricing";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/tienda/$slug")({
  loader: async ({ params }) => {
    const data = await getPublicStore({ data: { slug: params.slug } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    const name = (loaderData as any)?.store?.business_name ?? "Tienda";
    const desc =
      (loaderData as any)?.store?.descripcion ??
      `Compra en ${name} con entrega a domicilio por Hazorex.`;
    return {
      meta: [
        { title: `${name} — Tienda en Hazorex` },
        { name: "description", content: String(desc).slice(0, 155) },
        { property: "og:title", content: `${name} — Hazorex` },
        { property: "og:description", content: String(desc).slice(0, 155) },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: StorePage,
  errorComponent: ({ error }) => <div className="p-6 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => (
    <div className="p-10 text-center text-sm text-muted-foreground">Tienda no encontrada</div>
  ),
});

function StorePage() {
  const { t } = useTranslation();
  const { store, categories, products } = Route.useLoaderData() as any;
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});

  const addToCart = (id: string, delta: number) =>
    setCart((prev) => {
      const next = Math.max(0, (prev[id] ?? 0) + delta);
      const copy = { ...prev };
      if (next === 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });

  const open = isStoreOpen(store.horario);
  const hours = todayHoursLabel(store.horario);

  const grouped = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = (products as any[]).filter(
      (p) => !term || String(p.nombre).toLowerCase().includes(term),
    );
    const byCat = new Map<string, any[]>();
    for (const p of filtered) {
      const key = p.category_id ?? "__none__";
      byCat.set(key, [...(byCat.get(key) ?? []), p]);
    }
    const sections = (categories as any[])
      .map((c) => ({ id: c.id, nombre: c.nombre, items: byCat.get(c.id) ?? [] }))
      .filter((s) => s.items.length > 0);
    const loose = byCat.get("__none__") ?? [];
    if (loose.length > 0) {
      sections.push({ id: "__none__", nombre: t("storePage.otherCategory"), items: loose });
    }
    return sections;
  }, [products, categories, q, t]);

  return (
    <main className="pb-16">
      <div className="relative h-40 w-full bg-muted sm:h-56">
        {store.bannerUrl && (
          <img src={store.bannerUrl} alt={store.business_name} className="h-full w-full object-cover" />
        )}
      </div>

      <div className="mx-auto max-w-5xl px-4">
        <div className="-mt-10 flex items-end gap-4">
          {store.logoUrl ? (
            <img
              src={store.logoUrl}
              alt={store.business_name}
              className="h-20 w-20 rounded-2xl border-4 border-background object-cover"
            />
          ) : (
            <div className="grid h-20 w-20 place-items-center rounded-2xl border-4 border-background bg-muted">
              <Store className="h-7 w-7 text-muted-foreground" />
            </div>
          )}
          <div className="pb-2">
            <h1 className="font-serif text-2xl font-bold">{store.business_name}</h1>
            <p className="text-xs text-muted-foreground">
              {(store.zonas_que_atiende?.join(" · ") || store.city) ?? ""}
              {hours ? ` · ${hours}` : ""}
            </p>
          </div>
        </div>

        {store.descripcion && (
          <p className="mt-4 text-sm text-muted-foreground">{store.descripcion}</p>
        )}

        {!open && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            <Clock className="h-4 w-4 shrink-0" />
            {t("storePage.closedNotice")}
          </div>
        )}

        <div className="relative mt-6">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("storePage.searchPlaceholder")}
            className="w-full rounded-lg border border-border py-3 pl-10 pr-3 text-sm"
          />
        </div>

        {grouped.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">{t("storePage.noProducts")}</p>
        ) : (
          grouped.map((section: any) => (
            <section key={section.id} className="mt-8">
              <h2 className="mb-3 text-lg font-bold">{section.nombre}</h2>
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {section.items.map((p: any) => (
                  <li
                    key={p.id}
                    className={`rounded-xl border border-border bg-card p-3 ${
                      p.disponible ? "" : "opacity-50 grayscale"
                    }`}
                  >
                    <div className="relative">
                      {p.imagenUrl ? (
                        <img
                          src={p.imagenUrl}
                          alt={p.nombre}
                          loading="lazy"
                          className="h-28 w-full rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-28 w-full rounded-lg bg-muted" />
                      )}
                      {!p.disponible && (
                        <span className="absolute left-2 top-2 rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-white">
                          {t("storePage.soldOut")}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 line-clamp-2 text-sm font-semibold">{p.nombre}</div>
                    <div className="text-xs text-muted-foreground">
                      ${Number(p.precio).toFixed(2)} / {p.unidad}
                    </div>
                    {p.disponible && (
                      <div className="mt-2 flex items-center justify-between gap-2">
                        {cart[p.id] ? (
                          <div className="flex w-full items-center justify-between rounded-full bg-[#1e3a5f] px-2 py-1 text-white">
                            <button
                              type="button"
                              aria-label="Quitar uno"
                              onClick={() => addToCart(p.id, -1)}
                              className="grid h-7 w-7 place-items-center"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="text-sm font-bold">{cart[p.id]}</span>
                            <button
                              type="button"
                              aria-label="Agregar uno"
                              onClick={() => addToCart(p.id, 1)}
                              className="grid h-7 w-7 place-items-center"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addToCart(p.id, 1)}
                            className="w-full rounded-full bg-[#1e3a5f] py-1.5 text-xs font-semibold text-white"
                          >
                            Agregar
                          </button>
                        )}
                      </div>
                    )}
                  </li>

                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      <StoreCartBar
        businessId={store.id}
        products={products}
        cart={cart}
        onClear={() => setCart({})}
      />
    </main>
  );
}

function StoreCartBar({
  businessId,
  products,
  cart,
  onClear,
}: {
  businessId: string;
  products: any[];
  cart: Record<string, number>;
  onClear: () => void;
}) {
  const { user } = useAuth();
  const fetchPricing = useServerFn(getPricingConfig);
  const fetchCredit = useServerFn(getMyCredit);
  const fetchCliente = useServerFn(getMyCliente);
  const checkout = useServerFn(createStoreCheckout);

  const [fecha, setFecha] = useState<string>("");
  const [propina, setPropina] = useState(0);
  const [propinaOtro, setPropinaOtro] = useState("");
  const [usarSaldo, setUsarSaldo] = useState(true);
  const [busy, setBusy] = useState(false);

  const { data: config } = useQuery({
    queryKey: ["pricing-config"],
    queryFn: () => fetchPricing(),
    staleTime: 300_000,
  });
  const { data: credit } = useQuery({
    queryKey: ["my-credit"],
    queryFn: () => fetchCredit(),
    enabled: !!user,
    staleTime: 60_000,
  });
  const { data: cliente } = useQuery({
    queryKey: ["cliente", "me"],
    queryFn: () => fetchCliente(),
    enabled: !!user,
    staleTime: 60_000,
  });

  const pricing = config?.pricing ?? DEFAULT_PRICING;

  const lines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => {
          const p = products.find((x) => x.id === id);
          return p ? { p, qty } : null;
        })
        .filter(Boolean) as Array<{ p: any; qty: number }>,
    [cart, products],
  );

  const subtotalCents = lines.reduce(
    (s, l) => s + Math.round(Number(l.p.precio) * 100) * l.qty,
    0,
  );
  const totalLb = cartWeightLb(
    lines.map((l) => ({
      pesoLb: Number((l.p as any).peso_lb ?? pricing.defaultProductWeightLb),
      qty: l.qty,
    })),
    pricing,
  );
  const overLimit = totalLb > pricing.weightMaxLb;
  const tier = tierForSubtotal(subtotalCents, pricing);
  const tipCents = Math.max(0, Math.round(propina * 100));
  const weightCents = overLimit ? 0 : weightFeeCents(totalLb, pricing);
  // El cliente ve un solo precio de entrega: tramo + libras extra + recargo de procesamiento.
  const processingCents = processingFeeCents(subtotalCents + tier.feeCents + weightCents, pricing);
  const shippingCents = tier.feeCents + weightCents + processingCents;
  const balanceCents = Math.round(Number(credit?.balance ?? 0) * 100);
  const grossCents = subtotalCents + shippingCents + tipCents;
  const creditCents = usarSaldo ? Math.min(Math.max(balanceCents, 0), Math.max(grossCents - 100, 0)) : 0;
  const totalCents = Math.max(0, grossCents - creditCents);

  const fechas = useMemo(
    () => availableDeliveryDates(pricing, 4),
    [pricing.deliveryDaysMask, pricing.cutoffHourEt],
  );

  if (lines.length === 0) return null;

  const hasAddress = !!cliente?.direccion_linea1 && !!cliente?.ciudad && !!cliente?.codigo_postal;

  async function handleCheckout() {
    if (!user) {
      toast.error("Inicia sesión para continuar.");
      return;
    }
    if (!hasAddress) {
      toast.error("Agrega tu dirección en Mi cuenta antes de pagar.");
      return;
    }
    setBusy(true);
    try {
      const res = await checkout({
        data: {
          businessId,
          items: lines.map((l) => ({ productId: l.p.id, qty: l.qty })),
          address: {
            name: String(cliente!.nombre_completo ?? ""),
            street: String(cliente!.direccion_linea1 ?? ""),
            apt: String(cliente!.direccion_linea2 ?? ""),
            city: String(cliente!.ciudad ?? ""),
            zip: String(cliente!.codigo_postal ?? ""),
            country: String(cliente!.pais ?? "US").slice(0, 2),
          },
          fechaEntrega: fecha || fechas[0],
          propina: tipCents / 100,
          usarSaldo,
        },
      });
      onClear();
      if (res.url) window.location.href = res.url;
      else toast.success(`Pedido ${res.numeroPedido} creado.`);
    } catch (err) {
      toast.error((err as Error).message || "No se pudo iniciar el pago.");
    } finally {
      setBusy(false);
    }
  }

  const pct = Math.min(100, Math.round((totalLb / Math.max(pricing.weightIncludedLb, 1)) * 100));

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-4 backdrop-blur">
      <div className="mx-auto max-w-5xl space-y-3">
        <div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              Tu pedido pesa {totalLb} lb de {pricing.weightIncludedLb} lb incluidas
            </span>
            <span>{lines.length} productos</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full ${overLimit ? "bg-red-500" : pct >= 100 ? "bg-amber-500" : "bg-emerald-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {overLimit ? (
            <p className="mt-1 text-xs font-semibold text-red-600">
              Máximo {pricing.weightMaxLb} lb por pedido. Divide tu compra en 2 pedidos.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-2">
            <span className="text-muted-foreground">Día de entrega</span>
            <select
              value={fecha || fechas[0] || ""}
              onChange={(e) => setFecha(e.target.value)}
              className="rounded-lg border border-border bg-background px-2 py-1"
            >
              {fechas.map((f) => (
                <option key={f} value={f}>
                  {new Date(`${f}T12:00:00`).toLocaleDateString()}
                </option>
              ))}
            </select>
          </label>
          {balanceCents > 0 && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={usarSaldo}
                onChange={(e) => setUsarSaldo(e.target.checked)}
              />
              <span>Usar mi saldo (${(balanceCents / 100).toFixed(2)})</span>
            </label>
          )}
          <span className="text-muted-foreground">
            Entrega ${(shippingCents / 100).toFixed(2)}
            {tipCents > 0 ? ` · Propina $${(tipCents / 100).toFixed(2)}` : ""}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Propina para el repartidor</span>
          {[0, 2, 3, 5].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setPropina(v);
                setPropinaOtro("");
              }}
              className={`rounded-full px-3 py-1 font-semibold ${
                propina === v && propinaOtro === ""
                  ? "bg-[#1e3a5f] text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {v === 0 ? "Sin propina" : `$${v}`}
            </button>
          ))}
          <input
            value={propinaOtro}
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9.]/g, "");
              setPropinaOtro(v);
              setPropina(Number(v) || 0);
            }}
            inputMode="decimal"
            placeholder="Otro monto"
            className="w-24 rounded-lg border border-border bg-background px-2 py-1"
          />
        </div>

        {!hasAddress && user && (
          <p className="text-xs text-amber-700">
            Agrega tu dirección en{" "}
            <Link to="/mi-cuenta" className="underline">
              Mi cuenta
            </Link>{" "}
            para poder pagar.
          </p>
        )}

        <button
          type="button"
          onClick={handleCheckout}
          disabled={busy || overLimit}
          className="inline-flex w-full min-h-12 items-center justify-center gap-2 rounded-full bg-[#1e3a5f] px-6 text-sm font-bold text-white disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Pagar ${(totalCents / 100).toFixed(2)}
        </button>
      </div>
    </div>
  );
}

