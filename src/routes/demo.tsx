import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Minus, Plus, FlaskConical } from "lucide-react";
import { CartWeightTracker } from "@/components/CartWeightTracker";
import { TipSelector, type TipValue } from "@/components/TipSelector";
import { DeliveryChat } from "@/components/DeliveryChat";
import { ProofOfDelivery } from "@/components/ProofOfDelivery";
import type { CartItem } from "@/stores/shopifyCartStore";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Demo de componentes — Hazorex" },
      { name: "description", content: "Página interna para probar los componentes nuevos." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DemoPage,
});

type DemoItem = { id: string; name: string; weightKg: number; quantity: number };

const INITIAL_ITEMS: DemoItem[] = [
  { id: "1", name: "Bolsa de cemento", weightKg: 5, quantity: 2 },
  { id: "2", name: "Ladrillo (paquete)", weightKg: 10, quantity: 1 },
  { id: "3", name: "Arena fina (bolsa)", weightKg: 3, quantity: 1 },
];

function toCartItems(items: DemoItem[]): CartItem[] {
  return items.map((it) => ({
    lineId: null,
    variantId: it.id,
    variantTitle: it.name,
    price: { amount: "0", currencyCode: "USD" },
    quantity: it.quantity,
    weightKg: it.weightKg,
    selectedOptions: [],
    // product is required by the type but not read by CartWeightTracker
    product: { id: it.id, title: it.name, handle: it.id } as CartItem["product"],
  }));
}

function DemoPage() {
  const [items, setItems] = useState<DemoItem[]>(INITIAL_ITEMS);
  const [tip, setTip] = useState<TipValue>({ monto: 0, metodoPago: "app" });
  const [hasStairs, setHasStairs] = useState(false);
  const [lastProof, setLastProof] = useState<{ name: string; description: string; url: string } | null>(null);

  const inc = (id: string) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: i.quantity + 1 } : i)));
  const dec = (id: string) =>
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(0, i.quantity - 1) } : i)),
    );

  return (
    <div className="min-h-screen bg-neutral-50 py-8">
      <div className="mx-auto max-w-2xl px-4 space-y-6">
        <header className="rounded-xl bg-white border border-neutral-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-neutral-800">
            <FlaskConical size={18} />
            <h1 className="text-lg font-semibold">Demo de componentes</h1>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Página interna para probar los 4 componentes nuevos aislados. Nada acá toca la base de datos.
          </p>
        </header>

        {/* 1. CartWeightTracker */}
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-neutral-800">1. Peso del carrito</h2>
            <span className="text-xs text-neutral-500">Cambiá cantidades y mirá la barra</span>
          </div>

          <div className="rounded-xl bg-white border border-neutral-200 p-4 shadow-sm space-y-2">
            {items.map((it) => (
              <div key={it.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-neutral-800">{it.name}</p>
                  <p className="text-xs text-neutral-500">{it.weightKg} kg c/u</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => dec(it.id)}
                    className="rounded-md border border-neutral-200 p-1 text-neutral-600 hover:bg-neutral-50"
                    aria-label={`Menos ${it.name}`}
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-6 text-center text-sm tabular-nums">{it.quantity}</span>
                  <button
                    onClick={() => inc(it.id)}
                    className="rounded-md border border-neutral-200 p-1 text-neutral-600 hover:bg-neutral-50"
                    aria-label={`Más ${it.name}`}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <CartWeightTracker items={toCartItems(items)} />
        </section>

        {/* 2. TipSelector */}
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-neutral-800">2. Propina</h2>
            <label className="flex items-center gap-2 text-xs text-neutral-600">
              <input
                type="checkbox"
                checked={hasStairs}
                onChange={(e) => setHasStairs(e.target.checked)}
                className="rounded"
              />
              Hay escaleras
            </label>
          </div>

          <TipSelector hasStairs={hasStairs} onChange={setTip} />

          <pre className="rounded-lg bg-neutral-900 p-3 text-xs text-emerald-200 overflow-x-auto">
            {JSON.stringify(tip, null, 2)}
          </pre>
        </section>

        {/* 3. DeliveryChat */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-neutral-800">3. Chat con el delivery</h2>
          <DeliveryChat nombreDelivery="Carlos — Delivery (demo)" />
        </section>

        {/* 4. ProofOfDelivery (demo) */}
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-neutral-800">4. Prueba de entrega</h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
              Modo demo — no se guarda nada
            </span>
          </div>

          <ProofOfDelivery
            nombreCliente="Cliente demo"
            onSubmit={async ({ fotoFile, descripcion }) => {
              const url = URL.createObjectURL(fotoFile);
              setLastProof({ name: fotoFile.name, description: descripcion, url });
            }}
          />

          {lastProof && (
            <div className="rounded-xl bg-white border border-neutral-200 p-4 shadow-sm">
              <p className="text-xs font-medium text-neutral-800">Última prueba capturada (local):</p>
              <img
                src={lastProof.url}
                alt="Prueba de entrega demo"
                className="mt-2 max-h-56 w-full rounded-lg object-cover"
              />
              <p className="mt-2 text-xs text-neutral-600">
                <span className="font-medium">Descripción:</span> {lastProof.description}
              </p>
              <p className="text-[11px] text-neutral-400">Archivo: {lastProof.name}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
