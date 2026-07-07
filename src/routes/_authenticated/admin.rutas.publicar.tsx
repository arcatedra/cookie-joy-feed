import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Package, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchPendingBatches,
  publishRoute,
  suggestRouteDefaults,
  type PendingBatch,
} from "@/lib/admin-route-publishing";
import type { DispatchDay } from "@/lib/zone-dispatch";

export const Route = createFileRoute("/_authenticated/admin/rutas/publicar")({
  head: () => ({
    meta: [
      { title: "Publicar rutas — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPublishRoutesPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6 text-sm">No encontrado</div>,
});

type RouteRow = {
  id: string;
  route_name: string;
  zone_id: string;
  dispatch_date: string;
  delivery_day: DispatchDay;
  total_stops: number;
  fixed_pay: number;
  status: "disponible" | "asignada" | "en_transito" | "completada" | "cancelada";
  driver_id: string | null;
  created_at: string;
};

const LOW_ORDER_THRESHOLD = 3;

function AdminPublishRoutesPage() {
  const qc = useQueryClient();
  const [dayFilter, setDayFilter] = useState<"todos" | DispatchDay>("todos");
  const [selected, setSelected] = useState<PendingBatch | null>(null);

  const pendingQuery = useQuery({
    queryKey: ["admin-pending-batches", dayFilter],
    queryFn: () =>
      fetchPendingBatches(supabase, {
        deliveryDay: dayFilter === "todos" ? undefined : dayFilter,
      }),
  });

  const routesQuery = useQuery({
    queryKey: ["admin-published-routes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_routes")
        .select("*")
        .order("dispatch_date", { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      return (data ?? []) as RouteRow[];
    },
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link
        to="/repartidor"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>

      <h1 className="mb-6 font-serif text-2xl font-bold">Publicar rutas</h1>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Día:
        </span>
        {(["todos", "lunes", "viernes"] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDayFilter(d)}
            className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition ${
              dayFilter === d
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:bg-muted"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Lotes pendientes */}
      <section className="mb-10 rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-bold">Lotes pendientes de publicar</h2>
          <p className="text-xs text-muted-foreground">
            Pedidos confirmados aún no asignados a ninguna ruta, agrupados por zona y fecha
            de despacho.
          </p>
        </div>

        {pendingQuery.isLoading ? (
          <div className="grid place-items-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : pendingQuery.error ? (
          <p className="p-6 text-sm text-destructive">
            {(pendingQuery.error as Error).message}
          </p>
        ) : !pendingQuery.data || pendingQuery.data.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No hay lotes pendientes de publicar.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Zona</th>
                  <th className="px-4 py-2">Día</th>
                  <th className="px-4 py-2">Fecha</th>
                  <th className="px-4 py-2 text-right">Pedidos</th>
                  <th className="px-4 py-2 text-right">Peso (kg)</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pendingQuery.data.map((b) => {
                  const low = b.total_orders < LOW_ORDER_THRESHOLD;
                  return (
                    <tr key={`${b.zone_id}-${b.dispatch_date}-${b.delivery_day}`}>
                      <td className="px-4 py-2 font-medium">{b.zone_name}</td>
                      <td className="px-4 py-2 capitalize">{b.delivery_day}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {new Date(b.dispatch_date).toLocaleDateString("es-US", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="inline-flex items-center gap-1">
                          {b.total_orders}
                          {low && (
                            <span
                              title="Pocos pedidos — considera esperar"
                              className="inline-flex items-center text-amber-600"
                            >
                              <AlertTriangle className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        {Number(b.total_weight_kg).toFixed(1)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => setSelected(b)}
                          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                        >
                          <Package className="h-3.5 w-3.5" />
                          Publicar ruta
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Rutas publicadas */}
      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-bold">Rutas publicadas</h2>
          <p className="text-xs text-muted-foreground">
            Últimas 100 rutas creadas. Monitorea el estado y qué repartidor las tomó.
          </p>
        </div>
        {routesQuery.isLoading ? (
          <div className="grid place-items-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !routesQuery.data || routesQuery.data.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Aún no has publicado ninguna ruta.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Ruta</th>
                  <th className="px-4 py-2">Fecha</th>
                  <th className="px-4 py-2">Día</th>
                  <th className="px-4 py-2 text-right">Paradas</th>
                  <th className="px-4 py-2 text-right">Pago</th>
                  <th className="px-4 py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {routesQuery.data.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2 font-medium">{r.route_name}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {new Date(r.dispatch_date).toLocaleDateString("es-US", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-2 capitalize">{r.delivery_day}</td>
                    <td className="px-4 py-2 text-right">{r.total_stops}</td>
                    <td className="px-4 py-2 text-right">
                      ${Number(r.fixed_pay).toFixed(2)}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <PublishModal
          batch={selected}
          onClose={() => setSelected(null)}
          onPublished={() => {
            setSelected(null);
            qc.invalidateQueries({ queryKey: ["admin-pending-batches"] });
            qc.invalidateQueries({ queryKey: ["admin-published-routes"] });
          }}
        />
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: RouteRow["status"] }) {
  const map: Record<RouteRow["status"], { cls: string; label: string }> = {
    disponible: { cls: "bg-slate-200 text-slate-800", label: "Disponible" },
    asignada: { cls: "bg-amber-100 text-amber-800", label: "Asignada" },
    en_transito: { cls: "bg-amber-100 text-amber-800", label: "En tránsito" },
    completada: { cls: "bg-emerald-100 text-emerald-800", label: "Completada" },
    cancelada: { cls: "bg-red-100 text-red-800", label: "Cancelada" },
  };
  const s = map[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}

function PublishModal({
  batch,
  onClose,
  onPublished,
}: {
  batch: PendingBatch;
  onClose: () => void;
  onPublished: () => void;
}) {
  const defaults = useMemo(() => suggestRouteDefaults(batch), [batch]);
  const [routeName, setRouteName] = useState(defaults.routeName);
  const [fixedPay, setFixedPay] = useState<string>(defaults.suggestedPay.toFixed(2));

  const mutation = useMutation({
    mutationFn: async () => {
      const pay = Number(fixedPay);
      if (!routeName.trim()) throw new Error("Ingresa un nombre de ruta");
      if (!Number.isFinite(pay) || pay <= 0)
        throw new Error("El pago debe ser un número mayor a $0");
      return publishRoute(supabase, {
        zoneId: batch.zone_id,
        dispatchDate: batch.dispatch_date,
        deliveryDay: batch.delivery_day,
        routeName: routeName.trim(),
        fixedPay: pay,
      });
    },
    onSuccess: () => {
      toast.success("Ruta publicada, ya está visible para los repartidores");
      onPublished();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const low = batch.total_orders < LOW_ORDER_THRESHOLD;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="font-serif text-lg font-bold">Publicar ruta</h3>
            <p className="text-xs text-muted-foreground">
              {batch.zone_name} · {batch.delivery_day} ·{" "}
              {new Date(batch.dispatch_date).toLocaleDateString("es-US", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {low && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Este lote solo tiene {batch.total_orders} pedido
              {batch.total_orders === 1 ? "" : "s"}. Puedes esperar a que se acumulen
              más antes de publicar, pero si prefieres, puedes continuar de todas
              formas.
            </p>
          </div>
        )}

        <div className="mb-3 rounded-lg bg-muted/50 p-3 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pedidos:</span>
            <span className="font-semibold">{batch.total_orders}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Peso total:</span>
            <span className="font-semibold">
              {Number(batch.total_weight_kg).toFixed(1)} kg
            </span>
          </div>
        </div>

        <label className="mb-3 block text-sm">
          <span className="mb-1 block font-medium">Nombre de la ruta</span>
          <input
            type="text"
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>

        <label className="mb-4 block text-sm">
          <span className="mb-1 block font-medium">Pago fijo al repartidor (USD)</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={fixedPay}
            onChange={(e) => setFixedPay(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border bg-background px-4 py-2 text-sm hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirmar publicación
          </button>
        </div>
      </div>
    </div>
  );
}
