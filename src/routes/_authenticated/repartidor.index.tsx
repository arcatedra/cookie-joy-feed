import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { toast } from "sonner";
import { Loader2, MapPin, DollarSign, Clock, Package, Bike } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getActiveOrder, listAvailableOrders, acceptOrder } from "@/lib/courier.functions";

export const Route = createFileRoute("/_authenticated/repartidor/")({
  component: RepartidorHome,
});

function RepartidorHome() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const active = useQuery({
    queryKey: ["courier", "active-order"],
    queryFn: () => getActiveOrder(),
  });

  useEffect(() => {
    if (active.data?.id) {
      navigate({ to: "/repartidor/pedido/$id/navegacion", params: { id: active.data.id } });
    }
  }, [active.data?.id, navigate]);

  const list = useQuery({
    queryKey: ["courier", "available"],
    queryFn: () => listAvailableOrders(),
    enabled: !active.data,
  });

  const acceptFn = useServerFn(acceptOrder);
  const accept = useMutation({
    mutationFn: (orderId: string) => acceptFn({ data: { orderId } }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["courier"] });
      navigate({ to: "/repartidor/pedido/$id/resumen", params: { id: res.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (active.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f4f1ea]">
        <Loader2 className="size-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f1ea]">
      <header className="border-b border-[#c8862e]/30 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <Bike className="size-6 text-[#1e3a5f]" />
          <h1 className="font-serif text-xl font-bold text-[#1e3a5f]">Panel del repartidor</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <h2 className="mb-4 font-serif text-lg font-bold text-[#1e3a5f]">Pedidos disponibles</h2>

        {list.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-[#1e3a5f]" />
          </div>
        ) : (list.data?.length ?? 0) === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-[#4a3525]">
              No hay pedidos disponibles ahora mismo. Vuelve a revisar en unos minutos.
              <div className="mt-4">
                <Button variant="outline" onClick={() => list.refetch()}>Actualizar</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {list.data!.map((o) => (
              <Card key={o.id} className="border-[#c8862e]/30 bg-white">
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm text-[#4a3525]">
                        <MapPin className="size-4 shrink-0 text-[#1e3a5f]" />
                        <span className="truncate">{o.pickup_address}</span>
                      </p>
                      {o.pickup_contact_name && (
                        <p className="mt-1 text-xs text-[#4a3525]/70">Recolección: {o.pickup_contact_name}</p>
                      )}
                    </div>
                    <Badge className="bg-[#E6C35C] text-[#1e3a5f]">${o.estimated_earnings.toFixed(2)}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-[#4a3525]">
                    <span className="flex items-center gap-1"><Package className="size-3.5" /> {o.stops_count} entrega{o.stops_count === 1 ? "" : "s"}</span>
                    <span className="flex items-center gap-1"><Clock className="size-3.5" /> ~{o.estimated_duration_minutes} min</span>
                    <span className="flex items-center gap-1"><DollarSign className="size-3.5" /> pago semanal</span>
                  </div>
                  <Button
                    className="h-12 w-full bg-[#1e3a5f] text-white hover:bg-[#0f2338]"
                    disabled={accept.isPending}
                    onClick={() => accept.mutate(o.id)}
                  >
                    {accept.isPending && accept.variables === o.id ? (
                      <><Loader2 className="mr-2 size-4 animate-spin" /> Aceptando…</>
                    ) : (
                      "Aceptar pedido"
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link to="/" className="text-sm text-[#4a3525] underline-offset-4 hover:underline">
            Volver al inicio
          </Link>
        </div>
      </main>
    </div>
  );
}
