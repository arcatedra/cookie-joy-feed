import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  listStoreOrders,
  markOrderReadyAndCapture,
  startPreparingOrder,
} from "@/lib/store-orders.functions";
import { supabase } from "@/integrations/supabase/client";
import { groupByZoneZip, zoneForZip } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/negocios/pedidos")({
  head: () => ({
    meta: [
      { title: "Pedidos de mi tienda — HAZOREX" },
      {
        name: "description",
        content:
          "Prepara los pedidos de tu tienda y cobra el monto real cuando estén listos para recoger.",
      },
      { property: "og:title", content: "Pedidos de mi tienda — HAZOREX" },
      {
        property: "og:description",
        content: "Gestiona los pedidos de tu tienda en Hazorex.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StoreOrdersPage,
});

const ENTREGA: Record<string, string> = {
  tomado: "Tomado",
  recogido: "Recogido en tienda",
  en_camino: "En camino",
  entregado: "Entregado",
};

const ESTADO: Record<string, string> = {
  confirmado: "Reservado (pendiente de preparar)",
  preparando: "Preparando",
  listo: "Listo para recoger (cobrado)",
  entregado: "Entregado",
  cancelado: "Cancelado",
  cobro_fallido: "El cobro falló",
};

const money = (n: unknown) => `$${Number(n ?? 0).toFixed(2)}`;

function StoreOrdersPage() {
  const qc = useQueryClient();
  const fetchOrders = useServerFn(listStoreOrders);
  const prepare = useServerFn(startPreparingOrder);
  const ready = useServerFn(markOrderReadyAndCapture);

  const [reales, setReales] = useState<Record<string, number>>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ["store-orders"],
    queryFn: () => fetchOrders(),
    staleTime: 15_000,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["store-orders"] });

  const { data: zonas } = useQuery({
    queryKey: ["delivery-zones-public"],
    queryFn: async () => {
      const { data } = await supabase.from("delivery_zones").select("name, zip_codes, activo");
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  /** Pedidos agrupados por zona y luego por código postal. */
  const grupos = useMemo(() => {
    const zipOf = (o: any) => String(o.direccion_envio?.zip ?? "").trim().slice(0, 5);
    const sorted = [...((data ?? []) as any[])].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    return groupByZoneZip(sorted, (o) => zoneForZip(zonas as any, zipOf(o)), zipOf).flatMap((g) =>
      g.zips.map((z) => ({ zona: `${g.zona} · ${z.zip}`, orders: z.items })),
    );
  }, [data, zonas]);

  const prepareM = useMutation({
    mutationFn: (id: string) => prepare({ data: { id } }),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const readyM = useMutation({
    mutationFn: (vars: { id: string; items: { itemId: string; cantidadReal: number }[] }) =>
      ready({ data: vars }),
    onSuccess: (res: any) => {
      refresh();
      if (res?.ajustePendiente > 0) {
        toast.warning(
          `Se cobró ${money(res.cobrado)} (tope de la reserva). Queda un ajuste de ${money(
            res.ajustePendiente,
          )} por resolver con el cliente.`,
        );
      } else if (res?.cobrado != null) {
        toast.success(`Cobrado ${money(res.cobrado)}.`);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });


  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pedidos de mi tienda</h1>
        <Link to="/negocios/panel" className="text-sm underline">
          Panel
        </Link>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Cargando…</div>}
      {error && (
        <div className="text-sm text-destructive">
          No se pudieron cargar los pedidos.{" "}
          <button onClick={refresh} className="underline">
            Reintentar
          </button>
        </div>
      )}
      {!isLoading && data && data.length === 0 && (
        <div className="border rounded-lg p-8 text-center text-sm text-muted-foreground">
          Todavía no tienes pedidos.
        </div>
      )}

      {grupos.map((g) => (
      <div key={g.zona} className="space-y-3">
        <h2 className="mt-4 rounded-lg bg-muted px-3 py-2 text-sm font-bold">
          {g.zona} · {g.orders.length} {g.orders.length === 1 ? "pedido" : "pedidos"}
        </h2>
        {g.orders.map((o: any) => (
          <article key={o.id} className="border rounded-lg p-4 bg-card space-y-3">
            <header className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">#{o.numero_pedido}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleString()}
                </div>
              </div>
              <span className="text-xs rounded-full border px-2 py-1">
                {ESTADO[o.estado] ?? o.estado}
              </span>
            </header>

            <ul className="text-sm divide-y">
              {(o.items ?? []).map((it: any) => {
                const key = it.id as string;
                const value = reales[key] ?? Number(it.cantidad_real ?? it.cantidad);
                const editable = o.estado === "confirmado" || o.estado === "preparando" || o.estado === "cobro_fallido";
                return (
                  <li key={key} className="py-2 flex items-center justify-between gap-3">
                    <div>
                      <div>{it.nombre_producto}</div>
                      <div className="text-xs text-muted-foreground">
                        {money(it.precio_unitario)} / {it.unidad} · pedido: {it.cantidad}
                      </div>
                    </div>
                    {editable ? (
                      <label className="text-xs flex items-center gap-2">
                        Real
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={value}
                          onChange={(e) =>
                            setReales((p) => ({ ...p, [key]: Number(e.target.value) }))
                          }
                          className="w-20 rounded border bg-background px-2 py-1 text-right"
                        />
                      </label>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        entregado: {it.cantidad_real ?? it.cantidad}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="text-sm grid grid-cols-2 gap-1">
              <span className="text-muted-foreground">Estimado</span>
              <span className="text-right">{money(o.total_estimado)}</span>
              <span className="text-muted-foreground">Reservado</span>
              <span className="text-right">{money(o.monto_autorizado)}</span>
              {o.monto_capturado != null && (
                <>
                  <span className="text-muted-foreground">Cobrado</span>
                  <span className="text-right font-semibold">{money(o.monto_capturado)}</span>
                </>
              )}
              {Number(o.ajuste_pendiente ?? 0) > 0 && (
                <>
                  <span className="text-amber-600">Ajuste pendiente</span>
                  <span className="text-right text-amber-600">{money(o.ajuste_pendiente)}</span>
                </>
              )}
            </div>

            {o.captura_error && (
              <p className="text-xs text-destructive">Error de cobro: {o.captura_error}</p>
            )}

            <div className="flex flex-wrap gap-2">
              {o.estado === "confirmado" && (
                <button
                  onClick={() => prepareM.mutate(o.id)}
                  className="rounded-lg border px-4 py-2 text-sm"
                >
                  Empezar a preparar
                </button>
              )}
              {["confirmado", "preparando", "cobro_fallido"].includes(o.estado) && (
                <button
                  onClick={() =>
                    readyM.mutate({
                      id: o.id,
                      items: (o.items ?? []).map((it: any) => ({
                        itemId: it.id,
                        cantidadReal: reales[it.id] ?? Number(it.cantidad_real ?? it.cantidad),
                      })),
                    })
                  }
                  disabled={readyM.isPending}
                  className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-60"
                >
                  {readyM.isPending ? "Cobrando…" : "Listo para recoger (cobrar lo real)"}
                </button>
              )}
              {(o.estado === "listo" || o.estado === "entregado") && (
                <p className="text-sm text-muted-foreground">
                  {o.repartidor_nombre
                    ? `Repartidor: ${o.repartidor_nombre} · ${ENTREGA[o.estado_entrega ?? ""] ?? "Asignado"}`
                    : "Esperando que un repartidor lo tome"}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
      ))}
    </div>
  );
}
