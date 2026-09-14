import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, MapPin, Phone, Star, Bike, Package, Clock, LifeBuoy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getOrderTracking } from "@/lib/tracking.functions";
import { getMyStopEta, getMyDeliveryProof } from "@/lib/eta.functions";
import { ProofOfDeliveryView } from "@/components/ProofOfDelivery";
import { haversineKm } from "@/lib/gps-deeplinks";
import { GoogleMapView } from "@/components/courier/GoogleMapView";
import { ReportIssueSheet } from "@/components/ReportIssueSheet";
import { SupportChatSheet } from "@/components/SupportChatSheet";

export const Route = createFileRoute("/_authenticated/pedido/$id/seguimiento")({
  component: OrderTracking,
});

const STATUS_LABEL: Record<string, string> = {
  disponible: "Buscando repartidor",
  aceptado: "Repartidor asignado",
  en_recoleccion: "En camino a recoger",
  en_camino_entrega: "En camino a ti",
  completado: "Entregado",
  cancelado: "Cancelado",
};

const STEPS: { key: string; label: string }[] = [
  { key: "aceptado", label: "Asignado" },
  { key: "en_recoleccion", label: "Recolectando" },
  { key: "en_camino_entrega", label: "En ruta" },
  { key: "completado", label: "Entregado" },
];

function OrderTracking() {
  const { id } = Route.useParams();
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);
  const [issueId, setIssueId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const q = useQuery({
    queryKey: ["order-tracking", id],
    queryFn: () => getOrderTracking({ data: { orderId: id } }),
    refetchInterval: 15000,
  });

  const etaQ = useQuery({
    queryKey: ["stop-eta", id],
    queryFn: () => getMyStopEta({ data: { orderId: id } }),
    refetchInterval: 60000,
  });

  const proofQ = useQuery({
    queryKey: ["delivery-proof", id],
    queryFn: () => getMyDeliveryProof({ data: { orderId: id } }),
    staleTime: 30 * 60 * 1000,
  });

  // Realtime updates on this order
  useEffect(() => {
    const channel = supabase
      .channel(`tracking-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "courier_orders", filter: `id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["order-tracking", id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, qc]);

  if (q.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f4f1ea]">
        <Loader2 className="size-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }
  if (!q.data) return null;

  const { order, driver, stops } = q.data;
  const nextStop = stops.find((s) => s.status === "pendiente" || s.status === "en_camino");
  const target = order.status === "en_camino_entrega" && nextStop
    ? { lat: Number(nextStop.delivery_lat), lng: Number(nextStop.delivery_lng), address: nextStop.delivery_address }
    : { lat: Number(order.pickup_lat), lng: Number(order.pickup_lng), address: order.pickup_address };

  const driverPos = driver?.last_lat != null && driver?.last_lng != null
    ? { lat: Number(driver.last_lat), lng: Number(driver.last_lng) }
    : null;

  const distKm = driverPos ? haversineKm(driverPos, { lat: target.lat, lng: target.lng }) : null;
  const etaMin = distKm != null ? Math.max(1, Math.round((distKm / 25) * 60)) : null;

  const currentStepIdx = STEPS.findIndex((s) => s.key === order.status);

  return (
    <div className="flex h-[100dvh] flex-col bg-[#f4f1ea]">
      {/* Map */}
      <div className="relative flex-1">
        <MapView driver={driverPos} target={target} />
        <div className="absolute inset-x-3 top-3">
          <Badge className="bg-[#1e3a5f] text-white shadow-lg">
            {STATUS_LABEL[order.status] ?? order.status}
          </Badge>
        </div>
      </div>

      {/* Bottom info */}
      <div className="border-t border-[#c8862e]/30 bg-white shadow-2xl">
        <div className="mx-auto max-w-md space-y-3 p-4">
          {/* Comprobante de entrega */}
          {proofQ.data?.deliveredAt && (
            <ProofOfDeliveryView
              title={t("tracking.proofTitle")}
              deliveredAtLabel={t("tracking.proofDeliveredAt", {
                datetime: new Date(proofQ.data.deliveredAt).toLocaleString(i18n.language, {
                  day: "numeric",
                  month: "long",
                  hour: "numeric",
                  minute: "2-digit",
                }),
              })}
              photoUrl={proofQ.data.photoUrl}
              note={proofQ.data.note}
              noteLabel={t("tracking.proofNoteLabel")}
              photoAlt={t("tracking.proofPhotoAlt")}
            />
          )}

          {/* ETA */}
          {etaQ.data && (
            <div className="rounded-xl border border-[#c8862e]/30 bg-[#f4f1ea] p-3 text-center">
              <p className="text-2xl font-extrabold text-[#1e3a5f]">
                {etaQ.data.status === "entregado"
                  ? t("tracking.delivered")
                  : etaQ.data.status === "fallido"
                    ? t("tracking.failed")
                    : etaQ.data.eta
                      ? t("tracking.etaTitle", {
                          time: new Date(etaQ.data.eta).toLocaleTimeString(i18n.language, {
                            hour: "numeric",
                            minute: "2-digit",
                          }),
                        })
                      : t("tracking.etaPending")}
              </p>
              <p className="mt-1 text-sm text-[#4a3525]">
                {t("tracking.stopPosition", {
                  position: etaQ.data.sequenceNumber,
                  total: etaQ.data.totalStops,
                })}
              </p>
            </div>
          )}

          {/* Progress */}
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`grid size-7 place-items-center rounded-full text-xs font-bold ${
                      i <= currentStepIdx ? "bg-[#1e3a5f] text-white" : "bg-[#c8862e]/20 text-[#4a3525]/60"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span className={`mt-1 text-[9px] uppercase ${i <= currentStepIdx ? "text-[#1e3a5f]" : "text-[#4a3525]/60"}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`mb-4 h-1 flex-1 ${i < currentStepIdx ? "bg-[#1e3a5f]" : "bg-[#c8862e]/20"}`} />
                )}
              </div>
            ))}
          </div>

          {/* Driver info */}
          {driver ? (
            <Card className="border-[#c8862e]/30 bg-[#f4f1ea]">
              <CardContent className="flex items-center gap-3 p-3">
                {driver.profile_photo_url ? (
                  <img src={driver.profile_photo_url} alt={driver.full_name ?? ""} className="size-12 rounded-full object-cover" />
                ) : (
                  <div className="grid size-12 place-items-center rounded-full bg-[#1e3a5f] text-white">
                    <Bike className="size-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-[#1e3a5f]">{driver.full_name}</p>
                  <div className="flex items-center gap-2 text-xs text-[#4a3525]">
                    {driver.rating != null && driver.rating > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Star className="size-3 fill-[#E6C35C] text-[#E6C35C]" /> {Number(driver.rating).toFixed(2)}
                      </span>
                    )}
                    {driver.is_online && <span className="text-emerald-600">● En línea</span>}
                  </div>
                </div>
                {driver.phone && (
                  <a
                    href={`tel:${driver.phone}`}
                    className="grid size-10 place-items-center rounded-full bg-[#1e3a5f] text-white"
                  >
                    <Phone className="size-4" />
                  </a>
                )}
              </CardContent>
            </Card>
          ) : (
            <p className="rounded-lg bg-[#f4f1ea] p-3 text-center text-sm text-[#4a3525]">
              Buscando repartidor cercano…
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-[#f4f1ea] p-2">
              <p className="text-[10px] uppercase text-[#4a3525]/60">Distancia</p>
              <p className="font-bold text-[#1e3a5f]">
                {distKm != null ? (distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`) : "—"}
              </p>
            </div>
            <div className="rounded-lg bg-[#f4f1ea] p-2">
              <p className="text-[10px] uppercase text-[#4a3525]/60">ETA</p>
              <p className="font-bold text-[#1e3a5f]">
                {etaMin != null ? `~${etaMin} min` : "—"}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-[#c8862e]/30 bg-white p-3">
            <p className="flex items-start gap-2 text-sm text-[#4a3525]">
              <MapPin className="mt-0.5 size-4 shrink-0 text-[#1e3a5f]" />
              <span>{target.address}</span>
            </p>
            <p className="mt-1 flex items-center gap-2 text-xs text-[#4a3525]/70">
              <Package className="size-3" /> {stops.length} entrega{stops.length === 1 ? "" : "s"} · <Clock className="size-3" /> {order.accepted_at ? new Date(order.accepted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-[#c8862e] bg-[#f4f1ea] text-base font-bold text-[#1e3a5f] hover:bg-[#c8862e]/10"
          >
            <LifeBuoy className="size-5 text-[#c8862e]" />
            {t("issue.reportButton", { defaultValue: "Reportar un problema" })}
          </button>

          <ReportIssueSheet
            orderId={id}
            open={reportOpen}
            onOpenChange={setReportOpen}
            onCreated={(newId) => {
              setIssueId(newId);
              setChatOpen(true);
            }}
          />
          <SupportChatSheet issueId={issueId} open={chatOpen} onOpenChange={setChatOpen} />

          {order.status === "completado" && (
            <Link
              to="/pedido/$id/calificar"
              params={{ id }}
              className="block rounded-lg bg-[#1e3a5f] p-3 text-center text-sm font-bold text-white"
            >
              Calificar entrega
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function MapView({ driver, target }: { driver: { lat: number; lng: number } | null; target: { lat: number; lng: number } }) {
  const markers = [
    ...(driver ? [{ position: driver, color: "driver" as const, title: "Repartidor" }] : []),
    { position: target, color: "target" as const, title: "Destino" },
  ];
  return <GoogleMapView markers={markers} className="h-full w-full" />;
}
