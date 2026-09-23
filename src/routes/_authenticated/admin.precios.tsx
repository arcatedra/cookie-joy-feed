import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { saveDeliveryZone, deleteDeliveryZone, getPricingConfig, updatePricingConfig } from "@/lib/pricing.functions";
import { DEFAULT_PRICING, PRICING_KEYS, type PricingSettings } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/admin/precios")({
  head: () => ({
    meta: [
      { title: "Precios y cargos — Admin Hazorex" },
      { name: "description", content: "Edita los cargos por pedido, peso y pagos al repartidor." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PreciosPage,
  errorComponent: ({ error }) => <div className="p-6 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-6 text-sm">No encontrado</div>,
});

const LABELS: Record<keyof PricingSettings, string> = {
  serviceMinUsd: "Cargo de servicio mínimo ($)",
  servicePct: "Cargo de servicio (% del pedido)",
  weightIncludedLb: "Libras incluidas (sin cargo extra)",
  weightTier2MaxLb: "Tramo 2 hasta (lb)",
  weightTier2FeeUsd: "Cargo tramo 2 ($)",
  weightTier3MaxLb: "Tramo 3 hasta (lb)",
  weightTier3FeeUsd: "Cargo tramo 3 ($)",
  weightMaxLb: "Peso máximo por pedido (lb)",
  defaultProductWeightLb: "Peso por defecto de un producto (lb)",
  driverPerStopUsd: "Repartidor: pago por parada ($)",
  driverPerItemUsd: "Repartidor: pago por artículo extra ($)",
  driverItemThreshold: "Repartidor: artículos incluidos",
  driverWeightSharePct: "Repartidor: % del cargo por peso",
  driverTipSharePct: "Repartidor: % de la propina",
  referralBonusUsd: "Bono por referido ($)",
  tierSmallMaxUsd: "Tramo chico: hasta ($)",
  tierMediumMaxUsd: "Tramo mediano: hasta ($)",
  tierSmallFeeUsd: "Chico: envío total ($)",
  tierSmallDriverUsd: "Chico: para el repartidor ($)",
  tierSmallCompanyUsd: "Chico: para la empresa ($)",
  tierMediumFeeUsd: "Mediano: envío total ($)",
  tierMediumDriverUsd: "Mediano: para el repartidor ($)",
  tierMediumCompanyUsd: "Mediano: para la empresa ($)",
  tierLargeFeeUsd: "Grande: envío total ($)",
  tierLargeDriverUsd: "Grande: para el repartidor ($)",
  tierLargeCompanyUsd: "Grande: para la empresa ($)",
  cutoffHourEt: "Hora límite de corte (0-23, hora de NY)",
  deliveryDaysMask: "Días de entrega (no editar aquí)",
  weightExtraPerLbUsd: "Precio por libra extra ($)",
  processingFeePct: "Recargo de procesamiento (%)",
  payoutFrequencyDays: "Pago a súpers: inmediato",
};

const TIER_FIELDS: (keyof PricingSettings)[] = [
  "tierSmallMaxUsd",
  "tierMediumMaxUsd",
  "tierSmallFeeUsd",
  "tierSmallDriverUsd",
  "tierSmallCompanyUsd",
  "tierMediumFeeUsd",
  "tierMediumDriverUsd",
  "tierMediumCompanyUsd",
  "tierLargeFeeUsd",
  "tierLargeDriverUsd",
  "tierLargeCompanyUsd",
  "weightIncludedLb",
  "weightExtraPerLbUsd",
  "weightMaxLb",
  "defaultProductWeightLb",
  "cutoffHourEt",
  "processingFeePct",
];

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function PreciosPage() {
  const fetchConfig = useServerFn(getPricingConfig);
  const saveConfig = useServerFn(updatePricingConfig);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pricing-config"],
    queryFn: () => fetchConfig(),
  });

  const [form, setForm] = useState<Record<string, string>>({});
  const [zones, setZones] = useState<Array<{ zone: string; days: number[] }>>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    const p = data.pricing ?? DEFAULT_PRICING;
    const next: Record<string, string> = {};
    for (const field of Object.keys(PRICING_KEYS) as (keyof PricingSettings)[]) {
      next[field] = String(p[field]);
    }
    setForm(next);
    setZones(data.zones ?? []);
  }, [data]);

  function toggleDay(zone: string, day: number) {
    setZones((prev) =>
      prev.map((z) =>
        z.zone === zone
          ? { ...z, days: z.days.includes(day) ? z.days.filter((d) => d !== day) : [...z.days, day].sort() }
          : z,
      ),
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const pricing: Record<string, number> = {};
      for (const [field, key] of Object.entries(PRICING_KEYS)) {
        const v = Number(form[field]);
        if (Number.isFinite(v)) pricing[key] = v;
      }
      await saveConfig({ data: { pricing, zones } });
      toast.success("Precios guardados");
      await refetch();
    } catch (err) {
      toast.error((err as Error).message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-[#1e3a5f]">
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="font-serif text-2xl font-bold">Precios y cargos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Estos valores se aplican a todos los pedidos nuevos del marketplace.
        </p>

        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-bold">Envío por tramos y horarios</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            El pedido se clasifica solo según su subtotal y se le cobra el envío del tramo.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {TIER_FIELDS.map((field) => (
              <label key={field} className="block text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">{LABELS[field]}</span>
                <input
                  value={form[field] ?? ""}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  inputMode="decimal"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
            ))}
          </div>
          <div className="mt-4">
            <p className="text-xs text-muted-foreground">Días de entrega permitidos</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {DAY_NAMES.map((name, day) => {
                const mask = Number(form.deliveryDaysMask ?? 42) || 0;
                const on = (mask & (1 << day)) !== 0;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        deliveryDaysMask: String(on ? mask & ~(1 << day) : mask | (1 << day)),
                      })
                    }
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      on ? "bg-[#1e3a5f] text-white" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <p className="mt-6 rounded-xl border border-border bg-card p-4 text-sm">
          <span className="font-medium">Pago a súpers:</span> inmediato al cobrar el pedido.
          Lo pendiente se envía solo cuando la tienda o el repartidor conecta su cuenta.
        </p>

        <section className="mt-6 grid gap-3 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
          {(Object.keys(PRICING_KEYS) as (keyof PricingSettings)[])
            .filter(
              (f) => f !== "deliveryDaysMask" && f !== "payoutFrequencyDays" && !TIER_FIELDS.includes(f),
            )
            .map((field) => (
            <label key={field} className="block text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">{LABELS[field]}</span>
              <input
                value={form[field] ?? ""}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                inputMode="decimal"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
          ))}
        </section>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md bg-[#1e3a5f] px-5 py-2 text-sm font-semibold text-white hover:bg-[#16294a] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar cambios"}
        </button>

        <ZonesEditor zones={(data as any)?.deliveryZones ?? []} onChanged={() => refetch()} />
      </main>
    </div>
  );
}

type ZoneRow = { id?: string; name: string; zip_codes: string[]; route_days: number[]; activo?: boolean };

function ZonesEditor({ zones, onChanged }: { zones: ZoneRow[]; onChanged: () => void }) {
  const save = useServerFn(saveDeliveryZone);
  const remove = useServerFn(deleteDeliveryZone);
  const [editing, setEditing] = useState<{ id?: string; name: string; zips: string; days: number[] } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSave() {
    if (!editing) return;
    const zips = [...new Set(editing.zips.split(/[\s,;]+/).map((z) => z.trim()).filter(Boolean))];
    const bad = zips.find((z) => !/^\d{5}$/.test(z));
    if (bad) return toast.error(`Código postal inválido: ${bad}`);
    setBusy(true);
    try {
      await save({ data: { id: editing.id, name: editing.name, zip_codes: zips, route_days: editing.days, activo: true } });
      toast.success("Zona guardada");
      setEditing(null);
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("¿Borrar esta zona? Los repartidores que la tenían dejarán de verla.")) return;
    try {
      await remove({ data: { id } });
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <section id="zonas" className="mt-8 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">Zonas de entrega (por código postal)</h2>
        <button
          type="button"
          onClick={() => setEditing({ name: "", zips: "", days: [1, 3, 5] })}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
        >
          + Nueva zona
        </button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Los pedidos con un código postal fuera de todas las zonas solo los ve el admin para asignarlos a mano.
      </p>

      {zones.length === 0 && !editing && (
        <p className="mt-3 text-sm text-muted-foreground">Aún no hay zonas.</p>
      )}
      <ul className="mt-3 space-y-2">
        {zones.map((z) => (
          <li key={z.id} className="rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">{z.name}</p>
              <div className="flex gap-2 text-xs">
                <button
                  className="underline"
                  onClick={() =>
                    setEditing({ id: z.id, name: z.name, zips: z.zip_codes.join(", "), days: z.route_days })
                  }
                >
                  Editar
                </button>
                <button className="text-destructive underline" onClick={() => onDelete(z.id!)}>
                  Borrar
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {z.route_days.map((d) => DAY_NAMES[d]).join(", ") || "Sin días"} · {z.zip_codes.length} códigos:{" "}
              {z.zip_codes.slice(0, 12).join(", ")}
              {z.zip_codes.length > 12 ? "…" : ""}
            </p>
          </li>
        ))}
      </ul>

      {editing && (
        <div className="mt-4 space-y-3 rounded-lg border border-border p-4">
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Nombre de la zona</span>
            <input
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">
              Códigos postales (separados por coma o espacio)
            </span>
            <textarea
              value={editing.zips}
              onChange={(e) => setEditing({ ...editing, zips: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {DAY_NAMES.map((name, day) => (
              <button
                key={day}
                type="button"
                onClick={() =>
                  setEditing({
                    ...editing,
                    days: editing.days.includes(day)
                      ? editing.days.filter((d) => d !== day)
                      : [...editing.days, day].sort(),
                  })
                }
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  editing.days.includes(day) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onSave}
              disabled={busy || !editing.name.trim()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Guardando…" : "Guardar zona"}
            </button>
            <button onClick={() => setEditing(null)} className="rounded-md border px-4 py-2 text-sm">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
