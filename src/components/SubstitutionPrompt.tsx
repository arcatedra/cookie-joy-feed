import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  formatCountdown,
  secondsLeft,
  type SubstitutionMode,
} from "@/lib/substitutions";
import { respondSubstitution } from "@/lib/substitutions.functions";

interface Props {
  itemId: string;
  name: string;
  qty: number;
  notifiedAt: string | null;
  mode: SubstitutionMode | string;
  onResolved: () => void;
  onSeeOptions: () => void;
}

/**
 * Tarjeta que aparece cuando un artículo se marcó sin stock y el cliente
 * todavía no ha respondido. Tiene un reloj de 10 minutos: al vencer se aplica
 * sola la regla por defecto y el pedido sigue.
 */
export function SubstitutionPrompt({
  itemId,
  name,
  qty,
  notifiedAt,
  mode,
  onResolved,
  onSeeOptions,
}: Props) {
  const { t } = useTranslation();
  const [left, setLeft] = useState(() => secondsLeft(notifiedAt));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLeft(secondsLeft(notifiedAt));
    const timer = setInterval(() => {
      const next = secondsLeft(notifiedAt);
      setLeft(next);
      if (next <= 0) onResolved();
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifiedAt]);

  async function answer(response: "accept" | "refund") {
    if (busy) return;
    setBusy(true);
    try {
      await respondSubstitution({ data: { itemId, response } });
      onResolved();
    } catch {
      toast.error(
        t("subs.error", { defaultValue: "No pudimos guardar tu respuesta." }),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-amber-400 bg-amber-50 p-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-amber-900">
            {t("subs.outOfStockTitle", {
              defaultValue: "{{name}} está agotado",
              name,
            })}
          </p>
          <p className="text-xs text-amber-800">
            {t("subs.outOfStockBody", {
              defaultValue:
                "Cantidad: {{qty}}. Si no respondes en {{time}}, aplicamos tu opción por defecto y seguimos con tu pedido.",
              qty,
              time: formatCountdown(left),
            })}
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => answer("accept")}
          className="flex items-center justify-center gap-2 rounded-full bg-amber-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("subs.actionAccept", { defaultValue: "Sí, llévalo" })}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => answer("refund")}
          className="rounded-full border border-amber-600 px-4 py-2.5 text-sm font-bold text-amber-800 disabled:opacity-60"
        >
          {t("subs.actionRefund", { defaultValue: "Devuélveme el dinero" })}
        </button>
        <button
          type="button"
          onClick={onSeeOptions}
          className="rounded-full px-4 py-2 text-xs font-semibold text-amber-800 underline"
        >
          {t("subs.actionOptions", { defaultValue: "Ver otras opciones" })}
        </button>
      </div>

      <p className="mt-2 text-center text-[11px] font-semibold text-amber-700">
        {mode === "refund"
          ? t("subs.defaultRefund", {
              defaultValue: "Por defecto: te devolvemos el dinero.",
            })
          : t("subs.defaultBestMatch", {
              defaultValue: "Por defecto: llevamos la mejor opción similar.",
            })}
      </p>
    </div>
  );
}
