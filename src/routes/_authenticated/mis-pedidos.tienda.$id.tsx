import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyStoreOrder } from "@/lib/store-orders.functions";

export const Route = createFileRoute("/_authenticated/mis-pedidos/tienda/$id")({
  head: () => ({
    meta: [
      { title: "Pedido de tienda — HAZOREX" },
      {
        name: "description",
        content:
          "Sigue tu pedido de tienda en Hazorex: monto reservado, monto cobrado y estado de la entrega.",
      },
      { property: "og:title", content: "Pedido de tienda — HAZOREX" },
      {
        property: "og:description",
        content: "Detalle de tu pedido de tienda en Hazorex.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StoreOrderDetailPage,
});

const ESTADO: Record<string, string> = {
  pendiente_pago: "Esperando el pago",
  confirmado: "Confirmado · dinero reservado",
  preparando: "La tienda está preparando tu pedido",
  listo: "Listo · ya se cobró solo lo real",
  entregado: "Entregado",
  cancelado: "Cancelado",
  cobro_fallido: "Hubo un problema con el cobro",
};

const money = (n: unknown) => `$${Number(n ?? 0).toFixed(2)}`;

function StoreOrderDetailPage() {
  const { id } = Route.useParams();
  const fetchOrder = useServerFn(getMyStoreOrder);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["store-order", id],
    queryFn: () => fetchOrder({ data: { id } }),
    staleTime: 15_000,
  });

  if (isLoading) {
    return <div className="max-w-2xl mx-auto p-6 text-sm text-muted-foreground">Cargando…</div>;
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-sm">
        <p className="text-destructive mb-2">No se pudo cargar el pedido.</p>
        <button onClick={() => refetch()} className="underline">
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-sm">
        <p>No encontramos este pedido.</p>
        <Link to="/mis-pedidos" className="underline">
          Ver mis pedidos
        </Link>
      </div>
    );
  }

  const { order, items, store } = data as any;
  const cobrado = order.monto_capturado != null;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">#{order.numero_pedido}</h1>
        <Link to="/mis-pedidos" className="text-sm underline">
          Mis pedidos
        </Link>
      </div>

      {store?.business_name && (
        <p className="text-sm text-muted-foreground">{store.business_name}</p>
      )}

      <div className="rounded-lg border p-4 bg-card">
        <div className="font-semibold">{ESTADO[order.estado] ?? order.estado}</div>
        {!cobrado && order.estado === "confirmado" && (
          <p className="text-sm text-muted-foreground mt-1">
            Reservamos {money(order.monto_autorizado)} en tu tarjeta. Al terminar de preparar tu
            pedido se cobra solo lo que realmente se empacó; el resto se libera solo.
          </p>
        )}
        {cobrado && (
          <p className="text-sm text-muted-foreground mt-1">
            Se cobró {money(order.monto_capturado)} de los {money(order.monto_autorizado)}{" "}
            reservados.
          </p>
        )}
      </div>

      <ul className="rounded-lg border bg-card divide-y text-sm">
        {(items ?? []).map((it: any) => (
          <li key={it.id} className="p-3 flex items-center justify-between gap-3">
            <div>
              <div>{it.nombre_producto}</div>
              <div className="text-xs text-muted-foreground">
                {money(it.precio_unitario)} / {it.unidad} · {it.cantidad_real ?? it.cantidad}
              </div>
            </div>
            <span>{money(Number(it.precio_unitario) * Number(it.cantidad_real ?? it.cantidad))}</span>
          </li>
        ))}
      </ul>

      <div className="rounded-lg border p-4 bg-card text-sm grid grid-cols-2 gap-1">
        <span className="text-muted-foreground">Productos</span>
        <span className="text-right">{money(order.subtotal)}</span>
        <span className="text-muted-foreground">Entrega</span>
        <span className="text-right">{money(order.costo_envio)}</span>
        <span className="text-muted-foreground">Estimado</span>
        <span className="text-right">{money(order.total_estimado)}</span>
        <span className="font-semibold">{cobrado ? "Cobrado" : "Reservado"}</span>
        <span className="text-right font-semibold">
          {money(cobrado ? order.monto_capturado : order.monto_autorizado)}
        </span>
      </div>
    </div>
  );
}
