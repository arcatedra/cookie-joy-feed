import { useMemo, useState } from "react";
import { Package, AlertTriangle, Truck, X } from "lucide-react";
import type { CartItem } from "@/stores/shopifyCartStore";

// ---- Configuración ----
const CAPACIDAD_POR_ENTREGA_KG = 20;
const COSTO_POR_ENTREGA_EXTRA = 10;
const MARGEN_AVISO_KG = 2;

function useCartWeight(items: CartItem[]) {
  return useMemo(() => {
    const totalWeight = items.reduce(
      (sum, item) => sum + (item.weightKg ?? 0) * item.quantity,
      0,
    );
    const numEntregas = Math.max(1, Math.ceil(totalWeight / CAPACIDAD_POR_ENTREGA_KG));
    const capacidadTotal = numEntregas * CAPACIDAD_POR_ENTREGA_KG;
    const entregasExtra = numEntregas - 1;
    const costoExtra = entregasExtra * COSTO_POR_ENTREGA_EXTRA;
    const exceso = Math.max(0, totalWeight - CAPACIDAD_POR_ENTREGA_KG);
    const isOverweight = exceso > 0;
    const isNearLimit = isOverweight && exceso <= MARGEN_AVISO_KG;
    return {
      totalWeight,
      numEntregas,
      capacidadTotal,
      entregasExtra,
      costoExtra,
      exceso,
      isOverweight,
      isNearLimit,
    };
  }, [items]);
}

interface Props {
  items: CartItem[];
  onRemoveHeaviest?: () => void;
}

export function CartWeightTracker({ items, onRemoveHeaviest }: Props) {
  const [entregaExtraAceptada, setEntregaExtraAceptada] = useState(false);
  const {
    totalWeight,
    numEntregas,
    capacidadTotal,
    entregasExtra,
    costoExtra,
    exceso,
    isOverweight,
    isNearLimit,
  } = useCartWeight(items);

  if (totalWeight <= 0) return null;

  const pct = Math.min(100, (totalWeight / capacidadTotal) * 100);

  return (
    <div className="w-full rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-neutral-800">
        <Package size={18} />
        <span className="text-sm font-medium">Peso registrado en el sistema</span>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-2xl font-semibold text-neutral-900">
          {totalWeight.toFixed(2)} kg
        </span>
        <span className="text-xs text-neutral-500">
          capacidad actual {capacidadTotal} kg
        </span>
      </div>

      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
        <div
          className={`h-full rounded-full transition-all ${
            isOverweight && !entregaExtraAceptada ? "bg-amber-500" : "bg-emerald-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {isNearLimit && !entregaExtraAceptada && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div className="text-xs leading-relaxed">
            <p className="font-medium">
              Te pasaste por {exceso.toFixed(2)} kg del límite de {CAPACIDAD_POR_ENTREGA_KG} kg.
            </p>
            <p className="mt-1">
              Podés usar la segunda entrega (se despacha el mismo día, capacidad
              total 40 kg) por ${COSTO_POR_ENTREGA_EXTRA} extra, o quitar un
              producto para quedar dentro de los {CAPACIDAD_POR_ENTREGA_KG} kg.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => setEntregaExtraAceptada(true)}
                className="rounded-md bg-amber-600 px-2.5 py-1 text-white transition hover:bg-amber-700"
              >
                Usar 2da entrega (+${COSTO_POR_ENTREGA_EXTRA})
              </button>
              {onRemoveHeaviest && (
                <button
                  onClick={onRemoveHeaviest}
                  className="rounded-md border border-amber-300 px-2.5 py-1 text-amber-800 transition hover:bg-amber-100"
                >
                  Quitar un producto
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isOverweight && !isNearLimit && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-blue-800">
          <Truck size={16} className="mt-0.5 shrink-0" />
          <div className="text-xs leading-relaxed">
            <p className="font-medium">
              Tu pedido necesita {numEntregas} entregas de {CAPACIDAD_POR_ENTREGA_KG} kg
              (capacidad total {capacidadTotal} kg).
            </p>
            <p className="mt-1">
              Se suman {entregasExtra} entrega{entregasExtra !== 1 ? "s" : ""} extra a $
              {COSTO_POR_ENTREGA_EXTRA} c/u ={" "}
              <span className="font-semibold">${costoExtra}</span>. Todas se
              entregan el mismo día.
            </p>
          </div>
        </div>
      )}

      {isNearLimit && entregaExtraAceptada && (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-50 p-3 text-emerald-800">
          <div className="flex items-center gap-2 text-xs">
            <Truck size={16} />
            <span>
              2da entrega activada (+${COSTO_POR_ENTREGA_EXTRA}) — mismo día,
              capacidad 40 kg.
            </span>
          </div>
          <button
            onClick={() => setEntregaExtraAceptada(false)}
            className="text-emerald-700 hover:text-emerald-900"
            aria-label="Cancelar segunda entrega"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export default CartWeightTracker;
