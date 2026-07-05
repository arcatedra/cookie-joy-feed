import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, MapPin, Bike, Radio } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listLiveActiveOrders } from "@/lib/admin-drivers.functions";

export const Route = createFileRoute("/_authenticated/admin/live")({
  component: AdminLive,
});

const STATUS_COLOR: Record<string, string> = {
  aceptado: "bg-[#E6C35C] text-[#1e3a5f]",
  en_recoleccion: "bg-blue-500 text-white",
  en_camino_entrega: "bg-emerald-500 text-white",
};

function AdminLive() {
  const q = useQuery({
    queryKey: ["admin-live"],
    queryFn: () => listLiveActiveOrders(),
    refetchInterval: 10000,
  });

  return (
    <div className="min-h-screen bg-[#f4f1ea] pb-10">
      <header className="flex items-center gap-3 border-b border-[#c8862e]/30 bg-white p-4">
        <Link to="/" className="text-[#1e3a5f]">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 flex-1 className="flex-1 font-serif text-xl font-bold text-[#1e3a5f]">Operaciones en vivo</h1>
        <Radio className="size-5 animate-pulse text-emerald-500" />
      </header>

      <div className="mx-auto max-w-4xl space-y-2 p-4">
        {q.isLoading && <Loader2 className="mx-auto size-6 animate-spin text-[#1e3a5f]" />}
        {q.data?.length === 0 && (
          <p className="rounded-lg bg-white p-6 text-center text-sm text-[#4a3525]/70">
            No hay pedidos activos en este momento.
          </p>
        )}
        {q.data?.map((o) => {
          const d = o.drivers as {
            full_name: string | null;
            phone: string | null;
            last_lat: number | null;
            last_lng: number | null;
            last_seen_at: string | null;
            is_online: boolean | null;
          } | null;
          const lastSeenMin = d?.last_seen_at
            ? Math.round((Date.now() - new Date(d.last_seen_at).getTime()) / 60000)
            : null;
          return (
            <Card key={o.id} className="border-[#c8862e]/30 bg-white">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[#1e3a5f] text-white">
                  <Bike className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-[#1e3a5f]">
                      {d?.full_name ?? "Sin repartidor"}
                    </p>
                    <Badge className={STATUS_COLOR[o.status] ?? ""}>
                      {o.status.replace(/_/g, " ")}
                    </Badge>
                    {d?.is_online && (
                      <span className="text-xs text-emerald-600">● en línea</span>
                    )}
                  </div>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-[#4a3525]/70">
                    <MapPin className="size-3" /> {o.pickup_address}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-[10px] text-[#4a3525]/60">
                    {lastSeenMin != null && (
                      <span>Última señal: {lastSeenMin < 1 ? "ahora" : `${lastSeenMin}m`}</span>
                    )}
                    {d?.last_lat != null && (
                      <span>Pos: {Number(d.last_lat).toFixed(4)}, {Number(d.last_lng).toFixed(4)}</span>
                    )}
                  </div>
                </div>
                <Link
                  to="/pedido/$id/seguimiento"
                  params={{ id: o.id }}
                  className="rounded-lg bg-[#1e3a5f] px-3 py-2 text-xs font-semibold text-white"
                >
                  Ver en vivo
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
