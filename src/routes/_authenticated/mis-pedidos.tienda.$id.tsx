import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getStoreDeliveryPhoto } from "@/lib/store-delivery.functions";
import { getMyStoreOrder } from "@/lib/store-orders.functions";
import { submitDeliveryBlockRating } from "@/lib/delivery-block-operations.functions";
import { submitDeliveryClaim } from "@/lib/delivery-block-admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, Star } from "lucide-react";
import { toast } from "sonner";

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

const ENTREGA: Record<string, string> = {
  tomado: "Un repartidor tomó tu pedido",
  recogido: "El repartidor recogió tu pedido en la tienda",
  en_camino: "Tu pedido va en camino",
  entregado: "Pedido entregado",
};

function DeliveryPhoto({ orderId }: { orderId: string }) {
  const fetchPhoto = useServerFn(getStoreDeliveryPhoto);
  const { data } = useQuery({
    queryKey: ["store-delivery-photo", orderId],
    queryFn: () => fetchPhoto({ data: { id: orderId } }),
    staleTime: 30 * 60_000,
  });
  if (!data?.url) return null;
  return <img src={data.url} alt="Foto de entrega" className="mt-2 w-full max-h-80 rounded-lg object-cover" />;
}

const money = (n: unknown) => `$${Number(n ?? 0).toFixed(2)}`;

function StoreOrderDetailPage() {
  const { id } = Route.useParams();
  const fetchOrder = useServerFn(getMyStoreOrder);
  const rate = useServerFn(submitDeliveryBlockRating);
  const claim = useServerFn(submitDeliveryClaim);
  const fileRef = useRef<HTMLInputElement>(null);
  const [stars,setStars]=useState(5);
  const [reason,setReason]=useState("");
  const [busy,setBusy]=useState(false);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["store-order", id],
    queryFn: () => fetchOrder({ data: { id } }),
    staleTime: 15_000,
    // Recién pagado: el aviso de Stripe puede tardar unos segundos.
    refetchInterval: (q) => ((q.state.data as any)?.order?.estado === "pendiente_pago" && q.state.dataUpdateCount < 30 ? 2000 : false),
  });

  // Vacía el carrito de esa tienda solo cuando el pago quedó autorizado.
  const estadoPedido = (data as any)?.order?.estado as string | undefined;
  const bizId = (data as any)?.order?.business_id as string | undefined;
  useEffect(() => {
    if (!bizId || !estadoPedido || estadoPedido === "pendiente_pago") return;
    try {
      localStorage.removeItem(`hz-store-cart:${bizId}`);
    } catch {}
  }, [bizId, estadoPedido]);

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
  async function sendClaim(file?:File){if(!file||!reason.trim())return toast.error("Escribe el motivo y añade una foto.");setBusy(true);try{const {data:u}=await supabase.auth.getUser();if(!u.user)throw new Error("Inicia sesión de nuevo");const ext=(file.name.split(".").pop()||"jpg").slice(0,5);const path=`${u.user.id}/claim-${order.id}-${Date.now()}.${ext}`;const {error}=await supabase.storage.from("delivery-photos").upload(path,file,{contentType:file.type||"image/jpeg"});if(error)throw error;await claim({data:{orderId:order.id,reason,photoPath:path}});toast.success("Reclamo enviado para revisión.");setReason("");}catch(e){toast.error(e instanceof Error?e.message:"No se pudo enviar");}finally{setBusy(false);if(fileRef.current)fileRef.current.value="";}}

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

      {order.repartidor_nombre && (
        <div className="rounded-lg border p-4 bg-card text-sm space-y-1">
          <div className="font-semibold">
            {ENTREGA[order.estado_entrega ?? ""] ?? "Repartidor asignado"}
          </div>
          <div className="text-muted-foreground">Tu repartidor: {order.repartidor_nombre}</div>
          {order.foto_entrega_url && <DeliveryPhoto orderId={order.id} />}
        </div>
      )}

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
      {order.estado==="entregado"&&order.pricing_model==="reservable_block_v1"&&<section className="space-y-4 rounded-lg border bg-card p-4"><div><h2 className="font-semibold">Califica al repartidor</h2><div className="mt-2 flex gap-1">{[1,2,3,4,5].map((n)=><button key={n} type="button" aria-label={`${n} estrellas`} onClick={()=>setStars(n)}><Star className={`size-7 ${n<=stars?"fill-primary text-primary":"text-muted-foreground"}`}/></button>)}</div><Button className="mt-3" onClick={async()=>{try{await rate({data:{orderId:order.id,stars}});toast.success("Gracias por tu calificación.");}catch(e){toast.error(e instanceof Error?e.message:"No se pudo calificar")}}}>Enviar calificación</Button></div><div className="border-t pt-4"><h2 className="font-semibold">Reclamo dentro de 24 horas</h2><p className="mt-1 text-xs text-muted-foreground">La decisión y cualquier reembolso los revisa Hazorex.</p><textarea value={reason} onChange={(e)=>setReason(e.target.value)} placeholder="¿Qué ocurrió?" maxLength={120} className="mt-3 min-h-20 w-full rounded-md border bg-background p-3 text-sm"/><input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e)=>sendClaim(e.target.files?.[0])}/><Button variant="outline" disabled={busy||!reason.trim()} onClick={()=>fileRef.current?.click()}><Camera className="mr-2 size-4"/>Añadir foto y enviar</Button></div></section>}
    </div>
  );
}
