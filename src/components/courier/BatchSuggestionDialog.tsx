import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MapPin, Sparkles, TrendingUp, Clock } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { suggestBatch, createBatch } from "@/lib/batching.functions";

export function BatchSuggestionDialog({
  open,
  onOpenChange,
  orderId,
  onAccepted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderId: string;
  onAccepted: (batchId: string) => void;
}) {
  const suggestFn = useServerFn(suggestBatch);
  const createFn = useServerFn(createBatch);

  const q = useQuery({
    queryKey: ["batch-suggest", orderId],
    queryFn: () => suggestFn({ data: { orderId } }),
    enabled: open,
    staleTime: 60_000,
  });

  const create = useMutation({
    mutationFn: (orderIds: string[]) => createFn({ data: { orderIds } }),
    onSuccess: (r) => {
      toast.success(`Batch creado: ${r.count} entregas`);
      onAccepted(r.batchId);
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif">
            <Sparkles className="size-5 text-[#c8862e]" />
            Agrupa entregas cercanas
          </DialogTitle>
        </DialogHeader>

        {q.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-[#1e3a5f]" />
          </div>
        ) : !q.data || q.data.candidates.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#4a3525]">
            No hay pedidos cercanos ahora mismo para agrupar con éste.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 rounded-lg bg-[#f4f1ea] p-3 text-center">
              <div>
                <p className="text-[10px] uppercase text-[#4a3525]/70">Ganas</p>
                <p className="font-bold text-emerald-700">${q.data.estimatedEarnings.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-[#4a3525]/70">Distancia</p>
                <p className="font-bold text-[#1e3a5f]">{q.data.totalDistanceKm.toFixed(1)} km</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-[#4a3525]/70">Tiempo</p>
                <p className="flex items-center justify-center gap-1 font-bold text-[#1e3a5f]">
                  <Clock className="size-3" />~{q.data.totalDurationMin} min
                </p>
              </div>
            </div>

            {q.data.usedGoogle && (
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-700">
                <TrendingUp className="mr-1 size-3" /> Ruta optimizada con Google Maps
              </Badge>
            )}

            <div className="space-y-2">
              <div className="rounded-lg border-2 border-[#1e3a5f] bg-[#1e3a5f]/5 p-3">
                <p className="mb-1 text-[10px] font-bold uppercase text-[#1e3a5f]">Pedido base</p>
                <p className="flex items-start gap-2 text-sm">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-[#1e3a5f]" />
                  <span className="truncate">{q.data.base.pickup_address}</span>
                </p>
                <p className="mt-1 text-right text-sm font-bold text-emerald-700">
                  ${q.data.base.estimated_earnings.toFixed(2)}
                </p>
              </div>

              {q.data.candidates.map((c: any) => (
                <div key={c.id} className="rounded-lg border border-[#c8862e]/30 p-3">
                  <p className="flex items-start gap-2 text-sm text-[#4a3525]">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-[#c8862e]" />
                    <span className="truncate">{c.pickup_address}</span>
                  </p>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-[#4a3525]/70">
                      {c.distance_km < 1
                        ? `${Math.round(c.distance_km * 1000)} m`
                        : `${c.distance_km.toFixed(1)} km`}{" "}
                      · {c.stops_count} entrega{c.stops_count === 1 ? "" : "s"}
                    </span>
                    <span className="font-bold text-emerald-700">+${c.estimated_earnings.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            <Button
              className="h-12 w-full bg-[#1e3a5f] text-white hover:bg-[#0f2338]"
              disabled={create.isPending}
              onClick={() =>
                create.mutate([q.data!.base.id, ...q.data!.candidates.map((c) => c.id)])
              }
            >
              {create.isPending ? (
                <><Loader2 className="mr-2 size-4 animate-spin" /> Creando batch…</>
              ) : (
                `Aceptar ${1 + q.data.candidates.length} entregas`
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
