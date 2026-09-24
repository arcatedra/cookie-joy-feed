import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { groupByZoneZip } from "@/lib/pricing";
import { adminAssignStoreOrder, adminListStoreDeliveries } from "@/lib/store-delivery.functions";

export const Route = createFileRoute("/_authenticated/admin/pedidos-tienda")({
  head: () => ({
    meta: [
      { title: "Pedidos de tienda — Admin Hazorex" },
      { name: "description", content: "Asigna o reasigna repartidores a pedidos de tienda." },
      { property: "og:title", content: "Pedidos de tienda — Admin Hazorex" },
      { property: "og:description", content: "Asigna o reasigna repartidores a pedidos de tienda." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminStoreDeliveries,
  errorComponent: ({ error }) => <div className="p-6 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-6 text-sm">No encontrado</div>,
});

const STEP: Record<string, string> = {
  tomado: "Tomado",
  recogido: "Recogido",
  en_camino: "En camino",
  entregado: "Entregado",
};

function AdminStoreDeliveries() {
  const fetchList = useServerFn(adminListStoreDeliveries);
  const assign = useServerFn(adminAssignStoreOrder);
  const [busy, setBusy] = useState<string | null>(null);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-store-deliveries"],
    queryFn: () => fetchList(),
  });

  async function onAssign(id: string, driverId: string) {
    setBusy(id);
    try {
      await assign({ data: { id, driverId: driverId || null } });
      toast.success(driverId ? "Repartidor asignado" : "Pedido liberado");
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo asignar");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pedidos de tienda</h1>
          <p className="text-sm text-muted-foreground">Asigna o reasigna el repartidor de cada pedido.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
        </Button>
      </header>
      {isLoading ? (
        <div className="flex justify-center p-10">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (data?.pedidos ?? []).length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">No hay pedidos listos ni entregados.</p>
      ) : (
        <div className="space-y-5">
        {groupByZoneZip(data!.pedidos, (p) => p.zona, (p) => p.zip).map((g) => (
        <section key={g.zona} className="space-y-2">
          <h2 className="rounded-lg bg-muted px-3 py-2 text-sm font-bold">{g.zona}</h2>
          {g.zips.map((zg) => (
        <div key={zg.zip} className="space-y-1">
        <h3 className="text-xs font-medium text-muted-foreground">Código postal {zg.zip} · {zg.items.length} pedidos</h3>
        <ul className="divide-y rounded-2xl border">
          {zg.items.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  #{p.numero} · {p.tienda}
                </p>
                <p className="text-xs text-muted-foreground">
                  {p.pesoLb} lb · {p.articulos} art. · repartidor gana $
                  {p.gananciaUsd.toFixed(2)}
                </p>
                <p className="text-xs">
                  {p.estado === "entregado"
                    ? `Entregado por ${p.repartidorNombre ?? "—"}`
                    : p.repartidorNombre
                      ? `${p.repartidorNombre} · ${STEP[p.estadoEntrega ?? ""] ?? ""}`
                      : "Sin repartidor"}
                </p>
              </div>
              {p.estado !== "entregado" && (
                <select
                  className="rounded-lg border bg-background px-2 py-1 text-sm"
                  disabled={busy === p.id}
                  value={p.repartidorId ?? ""}
                  onChange={(e) => onAssign(p.id, e.target.value)}
                >
                  <option value="">Sin asignar</option>
                  {data!.repartidores.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.full_name}
                      {d.work_zone ? ` (${d.work_zone})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </li>
          ))}
        </ul>
        </div>
          ))}
        </section>
        ))}
        </div>
      )}
    </div>
  );
}
