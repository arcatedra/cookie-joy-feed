import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown } from "lucide-react";
import {
  MAX_SUBSTITUTES,
  type SubstitutionMode,
} from "@/lib/substitutions";
import { listProductos, type Producto } from "@/lib/productos.functions";

interface Props {
  itemId: string;
  mode: SubstitutionMode;
  substituteIds: string[];
  onChange: (mode: SubstitutionMode, substituteIds: string[]) => void;
}

let catalogCache: Promise<Producto[]> | null = null;
function loadCatalog() {
  if (!catalogCache) catalogCache = listProductos().catch(() => [] as Producto[]);
  return catalogCache;
}

export function SubstitutionPicker({ itemId, mode, substituteIds, onChange }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState<Producto[]>([]);

  useEffect(() => {
    if (mode !== "specific") return;
    let alive = true;
    loadCatalog().then((rows) => {
      if (alive) setCatalog(rows.filter((p) => p.id !== itemId));
    });
    return () => {
      alive = false;
    };
  }, [mode, itemId]);

  const options: Array<{ value: SubstitutionMode; label: string }> = [
    { value: "best_match", label: t("subs.modeBestMatch", { defaultValue: "La mejor opción similar" }) },
    { value: "specific", label: t("subs.modeSpecific", { defaultValue: "Estas alternativas, en orden" }) },
    { value: "refund", label: t("subs.modeRefund", { defaultValue: "No sustituir, devuélveme el dinero" }) },
  ];

  function toggleSubstitute(id: string) {
    if (substituteIds.includes(id)) {
      onChange("specific", substituteIds.filter((s) => s !== id));
    } else if (substituteIds.length < MAX_SUBSTITUTES) {
      onChange("specific", [...substituteIds, id]);
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
        aria-expanded={open}
      >
        {t("subs.ifMissing", { defaultValue: "Si no está disponible" })}:{" "}
        <span className="text-foreground">
          {options.find((o) => o.value === mode)?.label}
        </span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-2 space-y-1 rounded-xl bg-muted/50 p-2">
          {options.map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-foreground hover:bg-muted"
            >
              <input
                type="radio"
                name={`subs-${itemId}`}
                checked={mode === o.value}
                onChange={() => onChange(o.value, o.value === "specific" ? substituteIds : [])}
                className="accent-current"
              />
              {o.label}
            </label>
          ))}

          {mode === "specific" && (
            <div className="mt-1 max-h-48 overflow-y-auto rounded-lg bg-background p-1">
              <p className="px-2 py-1 text-[11px] text-muted-foreground">
                {t("subs.pickUpTo", {
                  defaultValue: "Elige hasta {{max}} alternativas",
                  max: MAX_SUBSTITUTES,
                })}
              </p>
              {catalog.length === 0 && (
                <p className="px-2 py-1 text-[11px] text-muted-foreground">
                  {t("subs.noCatalog", { defaultValue: "No hay alternativas disponibles." })}
                </p>
              )}
              {catalog.map((p) => {
                const idx = substituteIds.indexOf(p.id);
                const selected = idx >= 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleSubstitute(p.id)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs ${
                      selected ? "bg-muted font-semibold text-foreground" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="truncate">{p.nombre}</span>
                    {selected ? (
                      <span className="flex items-center gap-1 text-[11px]">
                        {idx + 1}
                        <Check className="h-3 w-3" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
