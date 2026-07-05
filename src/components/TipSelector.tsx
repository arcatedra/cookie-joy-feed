import { useState } from "react";
import { DollarSign, ArrowUpCircle } from "lucide-react";

const MONTOS_SUGERIDOS = [0, 5, 10, 15] as const;

const METODOS_PAGO = [
  { id: "app", label: "Pagar en la app" },
  { id: "efectivo", label: "Efectivo al recibir" },
] as const;

export type TipMetodoPago = "app" | "efectivo";

export interface TipValue {
  monto: number;
  metodoPago: TipMetodoPago;
}

interface Props {
  hasStairs?: boolean;
  onChange?: (v: TipValue) => void;
}

export function TipSelector({ hasStairs = false, onChange }: Props) {
  const [monto, setMonto] = useState(0);
  const [personalizado, setPersonalizado] = useState("");
  const [metodoPago, setMetodoPago] = useState<TipMetodoPago>("app");

  const notificar = (valor: number, metodo: TipMetodoPago) =>
    onChange?.({ monto: valor, metodoPago: metodo });

  const seleccionar = (valor: number) => {
    setMonto(valor);
    setPersonalizado("");
    notificar(valor, metodoPago);
  };

  const handlePersonalizado = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value.replace(/[^0-9.]/g, "");
    setPersonalizado(valor);
    const num = parseFloat(valor) || 0;
    setMonto(num);
    notificar(num, metodoPago);
  };

  const cambiarMetodo = (m: TipMetodoPago) => {
    setMetodoPago(m);
    notificar(monto, m);
  };

  return (
    <div className="w-full rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-neutral-800">
        <DollarSign size={18} />
        <span className="text-sm font-medium">Propina (opcional)</span>
      </div>

      {hasStairs && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-blue-800">
          <ArrowUpCircle size={16} className="mt-0.5 shrink-0" />
          <p className="text-xs leading-relaxed">
            Este pedido requiere subir escaleras. La propina es opcional, pero
            ayuda a que el delivery esté dispuesto a subir.
          </p>
        </div>
      )}

      <div className="mt-3 grid grid-cols-4 gap-2">
        {MONTOS_SUGERIDOS.map((valor) => (
          <button
            key={valor}
            type="button"
            onClick={() => seleccionar(valor)}
            className={`rounded-md border px-2 py-1.5 text-sm transition ${
              monto === valor && personalizado === ""
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            {valor === 0 ? "Sin propina" : `$${valor}`}
          </button>
        ))}
      </div>

      <div className="mt-2">
        <input
          type="text"
          inputMode="decimal"
          placeholder="Otro monto"
          value={personalizado}
          onChange={handlePersonalizado}
          className="w-full rounded-md border border-neutral-200 px-3 py-1.5 text-sm outline-none focus:border-emerald-400"
        />
      </div>

      {monto > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-medium text-neutral-600">
            ¿Cómo la querés pagar?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {METODOS_PAGO.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => cambiarMetodo(m.id)}
                className={`rounded-md border px-2 py-1.5 text-xs transition ${
                  metodoPago === m.id
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-neutral-400">
            {metodoPago === "app"
              ? "Se suma al total del pedido y queda garantizada: la plataforma se la liquida al delivery."
              : "Se la entregás en mano al delivery, en efectivo, al recibir el pedido."}
          </p>
        </div>
      )}
    </div>
  );
}

export default TipSelector;
