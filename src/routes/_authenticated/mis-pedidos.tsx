import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyPedidos } from "@/lib/pedidos.functions";
import { listMyTipPrompts } from "@/lib/post-delivery-tips.functions";
import { PostDeliveryTipCard } from "@/components/PostDeliveryTipCard";
import { PaymentProcessingRow } from "@/components/PaymentProcessingRow";

export const Route = createFileRoute("/_authenticated/mis-pedidos")({
  head: () => ({
    meta: [
      { title: "Mis pedidos — HAZOREX" },
      { name: "description", content: "Historial y desglose de tus compras en HAZOREX." },
      { property: "og:title", content: "Mis pedidos — HAZOREX" },
      { property: "og:description", content: "Historial y desglose de tus compras en HAZOREX." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MisPedidosPage,
});

const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  autorizado: "Reservado (se cobra lo real)",
  autorizacion_fallida: "Pago pendiente",
  autorizacion_vencida: "Reserva vencida",
  pagado: "Pagado",
  preparando: "Preparando",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

function MisPedidosPage() {
  const fetchPedidos = useServerFn(listMyPedidos);
  const fetchTipPrompts = useServerFn(listMyTipPrompts);
  const { data, isLoading, error } = useQuery({
    queryKey: ["pedidos", "me"],
    queryFn: () => fetchPedidos(),
  });
  const { data: tipPrompts } = useQuery({ queryKey: ["post-tip-prompts"], queryFn: () => fetchTipPrompts() });

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mis pedidos</h1>
        <Link to="/mi-cuenta" className="text-sm underline">Mi cuenta</Link>
      </div>

      {(tipPrompts ?? []).map((p) => (
        <div key={`${p.kind}-${p.orderId}`} className="space-y-1">
          <p className="text-xs text-muted-foreground">Pedido #{p.numero}</p>
          <PostDeliveryTipCard kind={p.kind} orderId={p.orderId} />
        </div>
      ))}

      {isLoading && <div className="text-sm text-muted-foreground">Cargando…</div>}
      {error && (
        <div className="text-sm text-destructive">
          No se pudieron cargar tus pedidos.
        </div>
      )}
      {!isLoading && data && data.length === 0 && (
        <div className="border rounded-lg p-8 text-center text-sm text-muted-foreground">
          Todavía no tienes pedidos.{" "}
          <Link to="/shop" className="underline">Ir a la tienda</Link>
        </div>
      )}

      <div className="space-y-3">
        {data?.map((p) => (
          <article key={p.id} className="border rounded-lg p-4 bg-card">
            <header className="flex items-center justify-between mb-2">
              <div>
                <div className="font-semibold">#{p.numero_pedido}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(p.creado_en).toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">
                  ${p.total.toFixed(2)} {p.moneda}
                </div>
                <div className="text-xs">
                  {ESTADO_LABEL[p.estado] ?? p.estado}
                </div>
              </div>
            </header>
            <ul className="text-sm space-y-1">
              {p.items.map((it) => (
                <li key={it.id} className="flex justify-between">
                  <span>
                    {it.cantidad}× {it.nombre_producto}
                  </span>
                  <span className="text-muted-foreground">
                    ${it.subtotal_item.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
            <PaymentProcessingRow amount={p.cargo_procesamiento} />
          </article>
        ))}
      </div>
    </div>
  );
}
