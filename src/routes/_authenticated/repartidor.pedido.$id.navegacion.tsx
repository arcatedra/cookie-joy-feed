import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  MapPin,
  Navigation2,
  Phone,
  MessageSquare,
  AlertTriangle,
  Check,
  Camera,
  KeyRound,
  PenLine,
  X,
  ChevronRight,
  Package,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getOrderDetail,
  confirmPickup,
  confirmDelivery,
  failStop,
  cancelOrder,
  uploadDeliveryProof,
  setPreferredGpsApp,
} from "@/lib/courier.functions";
import {
  availableGpsApps,
  detectPlatform,
  getStoredGpsPref,
  gpsDeepLink,
  gpsLabel,
  haversineKm,
  setStoredGpsPref,
  type GpsApp,
} from "@/lib/gps-deeplinks";
import { ChatDrawer } from "@/components/courier/ChatDrawer";

export const Route = createFileRoute("/_authenticated/repartidor/pedido/$id/navegacion")({
  component: NavegacionPedido,
});

type Target = {
  kind: "pickup" | "delivery";
  lat: number;
  lng: number;
  address: string;
  contactName: string | null;
  contactPhone: string | null;
  notes: string | null;
  label: string; // "Recolección" o "Entrega 1 de 3"
  stopId?: string;
  proofType?: "foto" | "firma" | "codigo" | "ninguno";
};

function NavegacionPedido() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const detail = useQuery({
    queryKey: ["courier", "order", id],
    queryFn: () => getOrderDetail({ data: { orderId: id } }),
    refetchInterval: 15000,
  });

  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const w = navigator.geolocation.watchPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
    );
    return () => navigator.geolocation.clearWatch(w);
  }, []);

  const target: Target | null = useMemo(() => {
    if (!detail.data) return null;
    const { order, stops } = detail.data;
    const totalStops = stops.length;
    if (order.status === "en_recoleccion" || order.status === "aceptado") {
      return {
        kind: "pickup",
        lat: Number(order.pickup_lat),
        lng: Number(order.pickup_lng),
        address: order.pickup_address,
        contactName: order.pickup_contact_name,
        contactPhone: null,
        notes: order.pickup_notes,
        label: "Recolección",
      };
    }
    if (order.status === "en_camino_entrega") {
      const next = stops.find((s) => s.status === "pendiente" || s.status === "en_camino");
      if (!next) return null;
      const idx = stops.filter((s) => s.status === "entregado" || s.status === "fallido").length + 1;
      return {
        kind: "delivery",
        lat: Number(next.delivery_lat),
        lng: Number(next.delivery_lng),
        address: next.delivery_address,
        contactName: next.recipient_name,
        contactPhone: next.recipient_phone,
        notes: null,
        label: `Entrega ${idx} de ${totalStops}`,
        stopId: next.id,
        proofType: next.proof_type,
      };
    }
    return null;
  }, [detail.data]);

  // Auto-navigate to completado when done
  useEffect(() => {
    if (detail.data?.order.status === "completado") {
      navigate({ to: "/repartidor/pedido/$id/completado", params: { id } });
    }
    if (detail.data?.order.status === "cancelado") {
      navigate({ to: "/repartidor" });
    }
  }, [detail.data?.order.status, id, navigate]);

  // GPS picker state
  const [gpsPickerOpen, setGpsPickerOpen] = useState(false);
  const setGpsFn = useServerFn(setPreferredGpsApp);
  const openRoute = () => {
    if (!target) return;
    const stored = getStoredGpsPref();
    if (stored) return openInApp(stored);
    setGpsPickerOpen(true);
  };
  const openInApp = (app: GpsApp) => {
    if (!target) return;
    const url = gpsDeepLink(app, target.lat, target.lng, target.address);
    window.open(url, "_blank", "noopener");
  };
  const pickGps = async (app: GpsApp) => {
    setStoredGpsPref(app);
    setGpsPickerOpen(false);
    try {
      await setGpsFn({ data: { app } });
    } catch {}
    openInApp(app);
  };

  // Confirm sheet
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [problemOpen, setProblemOpen] = useState(false);

  if (detail.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#0f2338]">
        <Loader2 className="size-8 animate-spin text-[#E6C35C]" />
      </div>
    );
  }
  if (!detail.data || !target) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f4f1ea] p-6 text-center">
        <p className="text-[#4a3525]">No hay parada activa.</p>
      </div>
    );
  }

  const distKm = pos ? haversineKm(pos, { lat: target.lat, lng: target.lng }) : null;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#f4f1ea]">
      {/* Map area */}
      <div className="relative flex-1">
        <MapPreview
          driver={pos}
          target={{ lat: target.lat, lng: target.lng }}
        />
        <div className="absolute inset-x-3 top-3 flex items-center gap-2">
          <Badge className="bg-[#1e3a5f] text-white shadow-lg">
            {target.kind === "pickup" ? <Store className="mr-1 size-3.5" /> : <Package className="mr-1 size-3.5" />}
            {target.label}
          </Badge>
          {distKm !== null && (
            <Badge variant="outline" className="border-white bg-white/95 text-[#1e3a5f] shadow">
              {distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} km`}
            </Badge>
          )}
        </div>
      </div>

      {/* Bottom sheet */}
      <div className="border-t border-[#c8862e]/30 bg-white shadow-2xl">
        <div className="mx-auto max-w-md space-y-3 p-4">
          <div>
            <p className="flex items-start gap-2 font-serif text-lg font-bold text-[#1e3a5f]">
              <MapPin className="mt-1 size-5 shrink-0" />
              <span className="leading-snug">{target.address}</span>
            </p>
            {target.contactName && (
              <p className="mt-1 pl-7 text-sm text-[#4a3525]">{target.contactName}</p>
            )}
            {target.notes && (
              <p className="mt-1 pl-7 text-sm italic text-[#4a3525]/80">{target.notes}</p>
            )}
          </div>

          <Button
            className="h-12 w-full bg-[#1e3a5f] text-base font-semibold text-white hover:bg-[#0f2338]"
            onClick={openRoute}
          >
            <Navigation2 className="mr-2 size-5" /> Abrir ruta
          </Button>

          <div className="flex gap-2">
            {target.contactPhone && (
              <>
                <Button asChild variant="outline" className="h-11 flex-1 border-[#c8862e]/40">
                  <a href={`tel:${target.contactPhone}`}>
                    <Phone className="mr-2 size-4" /> Llamar
                  </a>
                </Button>
                <Button asChild variant="outline" className="h-11 flex-1 border-[#c8862e]/40">
                  <a href={`sms:${target.contactPhone}`}>
                    <MessageSquare className="mr-2 size-4" /> Mensaje
                  </a>
                </Button>
              </>
            )}
          </div>

          <Button
            className="h-14 w-full bg-[#E6C35C] text-base font-bold text-[#1e3a5f] hover:bg-[#d4b04a]"
            onClick={() => setConfirmOpen(true)}
          >
            <Check className="mr-2 size-5" />
            {target.kind === "pickup" ? "Llegué al punto de recolección" : "Llegué a la dirección"}
          </Button>

          <div className="flex items-center justify-between pt-1">
            <button
              className="flex items-center gap-1 text-xs text-[#4a3525]/70 underline-offset-4 hover:underline"
              onClick={() => setProblemOpen(true)}
            >
              <AlertTriangle className="size-3.5" /> Reportar un problema
            </button>
            <button
              className="text-xs text-[#4a3525]/70 underline-offset-4 hover:underline"
              onClick={() => {
                setStoredGpsPref(null);
                toast.success("Te preguntaremos de nuevo qué app usar.");
              }}
            >
              Cambiar app de navegación
            </button>
          </div>
        </div>
      </div>

      <GpsPickerDialog
        open={gpsPickerOpen}
        onClose={() => setGpsPickerOpen(false)}
        onPick={pickGps}
      />

      <ConfirmSheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        target={target}
        orderId={id}
        onDone={() => {
          setConfirmOpen(false);
          qc.invalidateQueries({ queryKey: ["courier", "order", id] });
        }}
      />

      <ProblemSheet
        open={problemOpen}
        onClose={() => setProblemOpen(false)}
        target={target}
        orderId={id}
        onDone={() => {
          setProblemOpen(false);
          qc.invalidateQueries({ queryKey: ["courier", "order", id] });
        }}
      />
    </div>
  );
}

/** Static OpenStreetMap preview (no key required). */
function MapPreview({
  driver,
  target,
}: {
  driver: { lat: number; lng: number } | null;
  target: { lat: number; lng: number };
}) {
  const center = driver ?? target;
  // Small bbox around center
  const d = 0.01;
  const bbox = `${center.lng - d},${center.lat - d},${center.lng + d},${center.lat + d}`;
  const marker = `${target.lat},${target.lng}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`;
  return (
    <div className="relative h-full w-full bg-[#0f2338]">
      <iframe
        title="Mapa"
        src={src}
        className="h-full w-full border-0"
        loading="lazy"
      />
    </div>
  );
}

function GpsPickerDialog({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (app: GpsApp) => void;
}) {
  const apps = availableGpsApps();
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Elige tu app de navegación</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">Recordaremos tu elección para la próxima vez.</p>
        <div className="grid gap-2">
          {apps.map((a) => (
            <Button key={a} variant="outline" className="h-14 justify-between text-base" onClick={() => onPick(a)}>
              {gpsLabel[a]}
              <ChevronRight className="size-4" />
            </Button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Plataforma detectada: {detectPlatform()}
        </p>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmSheet({
  open,
  onClose,
  target,
  orderId,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  target: Target;
  orderId: string;
  onDone: () => void;
}) {
  const confirmPickupFn = useServerFn(confirmPickup);
  const confirmDeliveryFn = useServerFn(confirmDelivery);
  const uploadFn = useServerFn(uploadDeliveryProof);

  const [pickupChecked, setPickupChecked] = useState(false);
  const [code, setCode] = useState("");
  const [uploading, setUploading] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sigRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!open) {
      setPickupChecked(false);
      setCode("");
      setProofUrl(null);
    }
  }, [open]);

  const pickup = useMutation({
    mutationFn: () => confirmPickupFn({ data: { orderId } }),
    onSuccess: () => {
      toast.success("Recolección confirmada");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deliver = useMutation({
    mutationFn: () =>
      confirmDeliveryFn({
        data: {
          stopId: target.stopId!,
          proofUrl: proofUrl ?? null,
          proofCode: code || null,
        },
      }),
    onSuccess: () => {
      toast.success("Entrega confirmada");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = "";
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      const b64 = btoa(bin);
      const res = await uploadFn({
        data: {
          stopId: target.stopId!,
          fileName: file.name || "proof.jpg",
          contentBase64: b64,
          contentType: file.type || "image/jpeg",
        },
      });
      setProofUrl(res.url ?? res.path);
      toast.success("Prueba subida");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const uploadSignature = async () => {
    const canvas = sigRef.current;
    if (!canvas) return;
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/png"));
    if (!blob) return;
    await uploadFile(new File([blob], "firma.png", { type: "image/png" }));
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>
            {target.kind === "pickup" ? "Confirmar recolección" : "Confirmar entrega"}
          </SheetTitle>
        </SheetHeader>

        {target.kind === "pickup" ? (
          <div className="space-y-4 py-4">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4">
              <input
                type="checkbox"
                checked={pickupChecked}
                onChange={(e) => setPickupChecked(e.target.checked)}
                className="mt-1 size-5"
              />
              <span className="text-sm">Confirmo que tengo el pedido completo y en buen estado.</span>
            </label>
            <Button
              className="h-14 w-full bg-emerald-600 text-base font-bold hover:bg-emerald-700"
              disabled={!pickupChecked || pickup.isPending}
              onClick={() => pickup.mutate()}
            >
              {pickup.isPending ? <Loader2 className="mr-2 size-5 animate-spin" /> : <Check className="mr-2 size-5" />}
              Confirmar recolección
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {target.proofType === "foto" && (
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-sm font-medium"><Camera className="size-4" /> Foto de entrega</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadFile(f);
                  }}
                />
                <Button
                  variant="outline"
                  className="h-14 w-full"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? <Loader2 className="mr-2 size-5 animate-spin" /> : <Camera className="mr-2 size-5" />}
                  {proofUrl ? "Tomar otra foto" : "Tomar foto"}
                </Button>
                {proofUrl && <p className="text-xs text-emerald-700">✓ Foto guardada</p>}
              </div>
            )}

            {target.proofType === "firma" && (
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-sm font-medium"><PenLine className="size-4" /> Firma del destinatario</p>
                <SignaturePad canvasRef={sigRef} />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const c = sigRef.current;
                      if (!c) return;
                      const ctx = c.getContext("2d");
                      ctx?.clearRect(0, 0, c.width, c.height);
                      setProofUrl(null);
                    }}
                  >
                    Borrar
                  </Button>
                  <Button className="flex-1" disabled={uploading} onClick={uploadSignature}>
                    {uploading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                    Guardar firma
                  </Button>
                </div>
                {proofUrl && <p className="text-xs text-emerald-700">✓ Firma guardada</p>}
              </div>
            )}

            {target.proofType === "codigo" && (
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-sm font-medium"><KeyRound className="size-4" /> Código de entrega</p>
                <Input
                  inputMode="numeric"
                  placeholder="Pide el código al destinatario"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="h-12 text-lg"
                />
              </div>
            )}

            <Button
              className="h-14 w-full bg-emerald-600 text-base font-bold hover:bg-emerald-700"
              disabled={
                deliver.isPending ||
                (target.proofType === "foto" && !proofUrl) ||
                (target.proofType === "firma" && !proofUrl) ||
                (target.proofType === "codigo" && code.length < 3)
              }
              onClick={() => deliver.mutate()}
            >
              {deliver.isPending ? <Loader2 className="mr-2 size-5 animate-spin" /> : <Check className="mr-2 size-5" />}
              Confirmar entrega
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SignaturePad({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement | null> }) {
  const drawingRef = useRef(false);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#1e3a5f";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  }, [canvasRef]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * c.width, y: ((e.clientY - rect.top) / rect.height) * c.height };
  };

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={220}
      className="h-40 w-full touch-none rounded-lg border border-[#c8862e]/40 bg-white"
      onPointerDown={(e) => {
        drawingRef.current = true;
        const ctx = canvasRef.current!.getContext("2d")!;
        const p = point(e);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
      }}
      onPointerMove={(e) => {
        if (!drawingRef.current) return;
        const ctx = canvasRef.current!.getContext("2d")!;
        const p = point(e);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }}
      onPointerUp={() => (drawingRef.current = false)}
      onPointerLeave={() => (drawingRef.current = false)}
    />
  );
}

function ProblemSheet({
  open,
  onClose,
  target,
  orderId,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  target: Target;
  orderId: string;
  onDone: () => void;
}) {
  const failFn = useServerFn(failStop);
  const cancelFn = useServerFn(cancelOrder);
  const [mode, setMode] = useState<"menu" | "fail" | "cancel">("menu");
  const [reason, setReason] = useState("");
  const [confirmStep, setConfirmStep] = useState(false);

  useEffect(() => {
    if (!open) {
      setMode("menu");
      setReason("");
      setConfirmStep(false);
    }
  }, [open]);

  const fail = useMutation({
    mutationFn: () => failFn({ data: { stopId: target.stopId!, reason } }),
    onSuccess: () => {
      toast.success("Parada marcada como fallida");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelM = useMutation({
    mutationFn: () => cancelFn({ data: { orderId, reason } }),
    onSuccess: () => {
      toast.success("Pedido cancelado");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Reportar un problema</SheetTitle>
        </SheetHeader>

        {mode === "menu" && (
          <div className="space-y-2 py-4">
            <Button variant="outline" className="h-14 w-full justify-between" onClick={() => toast.info("Intenta recentrar tu ubicación o llama al soporte.")}>
              No encuentro la dirección <ChevronRight className="size-4" />
            </Button>
            {target.kind === "delivery" && (
              <Button variant="outline" className="h-14 w-full justify-between" onClick={() => setMode("fail")}>
                El cliente no responde <ChevronRight className="size-4" />
              </Button>
            )}
            <Button variant="outline" className="h-14 w-full justify-between text-red-700" onClick={() => setMode("cancel")}>
              Pedido cancelado en sitio <ChevronRight className="size-4" />
            </Button>
          </div>
        )}

        {mode === "fail" && (
          <div className="space-y-3 py-4">
            <p className="text-sm">Cuéntanos qué pasó (breve):</p>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: cliente no contestó tras 3 intentos" />
            {!confirmStep ? (
              <Button className="h-12 w-full" variant="destructive" disabled={!reason.trim()} onClick={() => setConfirmStep(true)}>
                Marcar entrega como fallida
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-700">¿Confirmas? Esta acción no se puede deshacer.</p>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setConfirmStep(false)}><X className="mr-1 size-4" /> Cancelar</Button>
                  <Button variant="destructive" className="flex-1" disabled={fail.isPending} onClick={() => fail.mutate()}>
                    {fail.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                    Sí, marcar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {mode === "cancel" && (
          <div className="space-y-3 py-4">
            <p className="text-sm">Motivo de la cancelación:</p>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: comercio cerrado" />
            {!confirmStep ? (
              <Button className="h-12 w-full" variant="destructive" disabled={!reason.trim()} onClick={() => setConfirmStep(true)}>
                Cancelar pedido completo
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-700">Esto cerrará el pedido sin ganancia. ¿Confirmas?</p>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setConfirmStep(false)}><X className="mr-1 size-4" /> No</Button>
                  <Button variant="destructive" className="flex-1" disabled={cancelM.isPending} onClick={() => cancelM.mutate()}>
                    {cancelM.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                    Sí, cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
