import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MapPin, DollarSign, Clock, Package, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getOrderDetail, startOrder } from "@/lib/courier.functions";

export const Route = createFileRoute("/_authenticated/repartidor/pedido/$id/resumen")({
  component: ResumenPedido,
});

function ResumenPedido() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const detail = useQuery({
    queryKey: ["courier", "order", id],
    queryFn: () => getOrderDetail({ data: { orderId: id } }),
  });

  const startFn = useServerFn(startOrder);
  const start = useMutation({
    mutationFn: () => startFn({ data: { orderId: id } }),
    onSuccess: () => navigate({ to: "/repartidor/pedido/$id/navegacion", params: { id } }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (detail.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f4f1ea]">
        <Loader2 className="size-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }
  if (detail.error || !detail.data) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f4f1ea] p-6 text-center">
        <p className="text-[#4a3525]">No pudimos cargar el pedido.</p>
      </div>
    );
  }

  const { order, stops } = detail.data;

  return (
    <div className="min-h-screen bg-[#f4f1ea] p-4">
      <div className="mx-auto max-w-md space-y-4 pt-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-[#4a3525]/60">Pedido aceptado</p>
          <h1 className="font-serif text-2xl font-bold text-[#1e3a5f]">Todo listo para comenzar</h1>
        </div>

        <Card className="border-[#c8862e]/30 bg-white">
          <CardContent className="space-y-3 p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-[#4a3525]/60">Recolección</p>
              <p className="flex items-start gap-2 font-medium text-[#1e3a5f]">
                <MapPin className="mt-0.5 size-4 shrink-0" /> {order.pickup_address}
              </p>
              {order.pickup_contact_name && (
                <p className="mt-1 text-sm text-[#4a3525]">{order.pickup_contact_name}</p>
              )}
              {order.pickup_notes && (
                <p className="mt-1 text-sm italic text-[#4a3525]/80">{order.pickup_notes}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-[#c8862e]/20 pt-3">
              <Stat icon={Package} label="Entregas" value={String(stops.length)} />
              <Stat icon={Clock} label="Tiempo est." value={`${order.estimated_duration_minutes} min`} />
              <Stat icon={DollarSign} label="Ganas" value={`$${Number(order.estimated_earnings).toFixed(2)}`} />
            </div>
          </CardContent>
        </Card>

        <Button
          className="h-14 w-full bg-[#1e3a5f] text-base font-semibold text-white hover:bg-[#0f2338]"
          disabled={start.isPending}
          onClick={() => start.mutate()}
        >
          {start.isPending ? <Loader2 className="mr-2 size-5 animate-spin" /> : <ArrowRight className="mr-2 size-5" />}
          Comenzar
        </Button>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: string }) {
  return (
    <div className="text-center">
      <Icon className="mx-auto size-4 text-[#1e3a5f]" />
      <p className="mt-1 text-[10px] uppercase tracking-wide text-[#4a3525]/60">{label}</p>
      <p className="text-sm font-semibold text-[#1e3a5f]">{value}</p>
    </div>
  );
}
