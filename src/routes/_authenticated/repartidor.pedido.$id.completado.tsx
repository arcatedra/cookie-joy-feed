import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, DollarSign, Clock, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getOrderDetail } from "@/lib/courier.functions";

export const Route = createFileRoute("/_authenticated/repartidor/pedido/$id/completado")({
  component: CompletadoPedido,
});

function CompletadoPedido() {
  const { id } = Route.useParams();
  const detail = useQuery({
    queryKey: ["courier", "order", id],
    queryFn: () => getOrderDetail({ data: { orderId: id } }),
  });

  if (detail.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f4f1ea]">
        <Loader2 className="size-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }
  if (!detail.data) return null;

  const { order, stops } = detail.data;
  const delivered = stops.filter((s) => s.status === "entregado").length;
  const failed = stops.filter((s) => s.status === "fallido").length;
  const durationMin = order.accepted_at && order.completed_at
    ? Math.round((new Date(order.completed_at).getTime() - new Date(order.accepted_at).getTime()) / 60000)
    : order.estimated_duration_minutes;

  return (
    <div className="grid min-h-screen place-items-center bg-[#f4f1ea] p-4">
      <div className="w-full max-w-md space-y-4 text-center">
        <div className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-100">
          <CheckCircle2 className="size-12 text-emerald-600" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-[#1e3a5f]">¡Pedido completado!</h1>
        <p className="text-sm text-[#4a3525]">Buen trabajo. Aquí tu resumen:</p>

        <Card className="border-[#c8862e]/30 bg-white text-left">
          <CardContent className="grid grid-cols-3 gap-2 p-4">
            <Stat icon={DollarSign} label="Ganaste" value={`$${Number(order.estimated_earnings).toFixed(2)}`} />
            <Stat icon={Clock} label="Tiempo" value={`${durationMin} min`} />
            <Stat icon={Package} label="Entregas" value={`${delivered}${failed ? ` (+${failed} falló)` : ""}`} />
          </CardContent>
        </Card>

        <Button
          asChild
          className="h-14 w-full bg-[#1e3a5f] text-base font-semibold text-white hover:bg-[#0f2338]"
        >
          <Link to="/repartidor">Buscar nuevo pedido</Link>
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
