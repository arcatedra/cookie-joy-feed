import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { listTransfers, retryTransfer } from "@/lib/admin-transfers.functions";

export const Route = createFileRoute("/_authenticated/admin/transferencias")({
  head: () => ({
    meta: [
      { title: "Transferencias — Admin Hazorex" },
      { name: "description", content: "Pagos a repartidores y súpers: pagados, pendientes y fallidos." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TransferenciasPage,
  errorComponent: ({ error }) => <div className="p-6 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-6 text-sm">No encontrado</div>,
});

const FILTERS = ["todos", "pendiente", "pagado", "fallido"] as const;

function TransferenciasPage() {
  const fetchRows = useServerFn(listTransfers);
  const retry = useServerFn(retryTransfer);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("todos");
  const [busy, setBusy] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-transfers"],
    queryFn: () => fetchRows(),
  });

  const rows = (data ?? []).filter((r) => filter === "todos" || r.estado === filter);

  async function onRetry(id: string, kind: "repartidor" | "negocio") {
    setBusy(id);
    try {
      const res = await retry({ data: { id, kind } });
      toast.success(res.skipped ? "Sin nada que transferir todavía" : "Transferencia enviada");
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo transferir");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Transferencias</h1>
          <p className="text-sm text-muted-foreground">Pagos a repartidores y a súpers.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
        </Button>
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-sm ${
              filter === f ? "bg-foreground text-background" : "border"
            }`}
          >
            {f === "todos" ? "Todas" : f === "pendiente" ? "Pendientes" : f === "pagado" ? "Pagadas" : "Fallidas"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center p-10">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">No hay transferencias que mostrar.</p>
      ) : (
        <ul className="divide-y rounded-2xl border">
          {rows.map((r) => (
            <li key={`${r.kind}-${r.id}`} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {r.nombre}{" "}
                  <span className="text-xs text-muted-foreground">
                    ({r.kind === "repartidor" ? "repartidor" : "súper"})
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.pedido ? `Pedido ${r.pedido} · ` : ""}
                  {new Date(r.fecha).toLocaleString("es-US")}
                </p>
                {r.error ? <p className="text-xs text-red-600">{r.error}</p> : null}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">${Number(r.montoUsd).toFixed(2)}</span>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    r.estado === "pagado"
                      ? "bg-emerald-100 text-emerald-800"
                      : r.estado === "fallido"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {r.estado === "pagado" ? "Pagada" : r.estado === "fallido" ? "Falló" : "Pendiente"}
                </span>
                {r.estado !== "pagado" ? (
                  <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => onRetry(r.id, r.kind)}>
                    {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reintentar"}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
