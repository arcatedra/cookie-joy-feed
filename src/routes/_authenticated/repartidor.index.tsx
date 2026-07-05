import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, MapPin, DollarSign, Clock, Package, Bike, Radio, Bell, BellOff, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import {
  getActiveOrder,
  listAvailableOrders,
  acceptOrder,
  getDriverStatus,
  setOnlineStatus,
  pingLocation,
  savePushSubscription,
} from "@/lib/courier.functions";
import { BatchSuggestionDialog } from "@/components/courier/BatchSuggestionDialog";

export const Route = createFileRoute("/_authenticated/repartidor/")({
  component: RepartidorHome,
});

function RepartidorHome() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const watchIdRef = useRef<number | null>(null);
  const dingRef = useRef<HTMLAudioElement | null>(null);
  const [batchOrderId, setBatchOrderId] = useState<string | null>(null);

  const status = useQuery({
    queryKey: ["courier", "driver-status"],
    queryFn: () => getDriverStatus(),
  });

  const active = useQuery({
    queryKey: ["courier", "active-order"],
    queryFn: () => getActiveOrder(),
  });

  // Redirect onboarding-incomplete users
  useEffect(() => {
    if (status.data && !status.data.onboarding_completed_at) {
      navigate({ to: "/repartidor/onboarding" });
    }
  }, [status.data, navigate]);

  useEffect(() => {
    if (active.data?.id) {
      navigate({ to: "/repartidor/pedido/$id/navegacion", params: { id: active.data.id } });
    }
  }, [active.data?.id, navigate]);

  const isOnline = !!status.data?.is_online;

  const list = useQuery({
    queryKey: ["courier", "available"],
    queryFn: () => listAvailableOrders(),
    enabled: !active.data && isOnline,
    refetchInterval: isOnline ? 15000 : false,
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

  const onlineFn = useServerFn(setOnlineStatus);
  const pingFn = useServerFn(pingLocation);
  const savePushFn = useServerFn(savePushSubscription);

  const toggleOnline = useMutation({
    mutationFn: async (target: boolean) => {
      let coords: { lat: number; lng: number } | null = null;
      if (target && "geolocation" in navigator) {
        try {
          coords = await new Promise<{ lat: number; lng: number }>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
              (e) => reject(e),
              { enableHighAccuracy: true, timeout: 8000 }
            );
          });
        } catch {
          throw new Error("Necesitamos permiso de ubicación para ponerte en línea");
        }
      }
      return onlineFn({ data: { online: target, lat: coords?.lat ?? null, lng: coords?.lng ?? null } });
    },
    onSuccess: (_r, target) => {
      qc.invalidateQueries({ queryKey: ["courier", "driver-status"] });
      qc.invalidateQueries({ queryKey: ["courier", "available"] });
      toast.success(target ? "Estás en línea. Recibirás pedidos." : "Estás fuera de línea");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Live GPS tracking while online
  useEffect(() => {
    if (!isOnline || !("geolocation" in navigator)) {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (p) => {
        pingFn({ data: { lat: p.coords.latitude, lng: p.coords.longitude } }).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isOnline, pingFn]);

  // Realtime: alert on new available orders
  useEffect(() => {
    if (!isOnline) return;
    const channel = supabase
      .channel("courier-available-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "courier_orders", filter: "status=eq.disponible" },
        () => {
          qc.invalidateQueries({ queryKey: ["courier", "available"] });
          try {
            dingRef.current?.play().catch(() => {});
          } catch {
            /* noop */
          }
          toast.success("¡Nuevo pedido disponible!", { duration: 6000 });
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            try {
              new Notification("Nuevo pedido disponible", {
                body: "Toca para revisar los detalles",
                icon: "/favicon.ico",
              });
            } catch {
              /* noop */
            }
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOnline, qc]);

  async function enableNotifications() {
    if (typeof Notification === "undefined") {
      toast.error("Este navegador no soporta notificaciones");
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
    if (perm !== "granted") {
      toast.error("Notificaciones bloqueadas");
      return;
    }
    toast.success("Notificaciones activadas");

    // Try to register push subscription (best-effort; no server delivery yet)
    try {
      if ("serviceWorker" in navigator && "PushManager" in window) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          const existing = await reg.pushManager.getSubscription();
          if (existing) {
            const json = existing.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
            if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
              await savePushFn({
                data: {
                  endpoint: json.endpoint,
                  p256dh: json.keys.p256dh,
                  auth: json.keys.auth,
                  userAgent: navigator.userAgent,
                },
              });
            }
          }
        }
      }
    } catch {
      /* push registration is best-effort */
    }
  }

  if (status.isLoading || active.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f4f1ea]">
        <Loader2 className="size-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  if (status.data?.application_status !== "aprobado") {
    return (
      <div className="min-h-screen bg-[#f4f1ea] p-6">
        <div className="mx-auto max-w-lg rounded-lg border border-[#c8862e]/30 bg-white p-6 text-center">
          <h1 className="font-serif text-xl font-bold text-[#1e3a5f]">Tu solicitud está en revisión</h1>
          <p className="mt-2 text-sm text-[#4a3525]">
            Te notificaremos por correo cuando esté aprobada. Estado actual: {status.data?.application_status ?? "sin solicitud"}.
          </p>
          <Link to="/" className="mt-4 inline-block text-sm text-[#c8862e] underline-offset-4 hover:underline">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f1ea]">
      {/* silent ding via data URL (short beep) */}
      <audio
        ref={dingRef}
        preload="auto"
        src="data:audio/wav;base64,UklGRlwCAABXQVZFZm10IBAAAAABAAEAgD4AAIA+AAABAAgAZGF0YTgCAAB/f39/f39/f39/f39/f39/f4CAgICAgICAgICAgICAgIB/f39/f39/f39/f39/f3+AgICAgICAgICAgICAgIB/f39/f39/f39/f39/f4CAgICAgICAgICAgICAgH9/f39/f39/f39/f39/gICAgICAgICAgICAgICAf39/f39/f39/f39/f4CAgICAgICAgICAgICAgH9/f39/f39/f39/f3+AgICAgICAgICAgICAgIB/f39/f39/f39/f39/gICAgICAgICAgICAgICAf39/f39/f39/f39/f4CAgICAgICAgICAgICAgH9/f39/f39/f39/f39/gICAgICAgICAgICAgICAf39/f39/f39/f39/f4CAgICAgICAgICAgICAgH9/f39/f39/f39/f39/gICAgICAgICAgICAgICAf39/f39/f39/f39/f4CAgICAgICAgICAgICAgH9/f39/f39/f39/f39/gICAgICAgICAgICAgICAf39/f39/f39/f39/f4CAgICAgICAgICAgICAgH9/f39/f39/f39/f39/gICAgICAgICAgICAgICAf39/f39/f39/f39/f4CAgICAgICAgICAgICAgH9/f39/f39/f39/f39/gICAgICAgICAgICAgICAf39/f39/f39/f39/f4CAgICAgICAgICAgICAgH9/f39/f39/f39/f39/gICAgICAgICAgICAgICAf39/f39/f39/f39/f4CAgICAgICAgICAgICAgH9/f39/f39/f39/f39/"
      />
      <header className="border-b border-[#c8862e]/30 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <div className="flex items-center gap-3">
            <Bike className="size-6 text-[#1e3a5f]" />
            <h1 className="flex-1 font-serif text-xl font-bold text-[#1e3a5f]">Panel del repartidor</h1>
            <Link
              to="/repartidor/calificaciones"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[#1e3a5f] hover:bg-[#f4f1ea]"
              title="Mis calificaciones"
            >
              <span className="hidden sm:inline">Rating</span>
              <span className="text-[#E6C35C]">★</span>
            </Link>
            <Link
              to="/repartidor/wallet"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[#1e3a5f] hover:bg-[#f4f1ea]"
              title="Ir a mi wallet"
            >
              <span className="hidden sm:inline">Wallet</span>
              <span className="text-[#c8862e]">💰</span>
            </Link>
            <Button
              size="sm"
              variant="ghost"
              onClick={enableNotifications}
              className="gap-1.5 text-xs"
              title="Activar notificaciones"
            >
              {notifPerm === "granted" ? (
                <><Bell className="size-4 text-emerald-600" /> Alertas activas</>
              ) : (
                <><BellOff className="size-4" /> Activar alertas</>
              )}
            </Button>
          </div>

          {/* Online / Offline toggle */}
          <div className={`mt-4 flex items-center justify-between rounded-lg border-2 p-4 transition ${
            isOnline ? "border-emerald-500 bg-emerald-50" : "border-[#c8862e]/30 bg-[#f4f1ea]"
          }`}>
            <div className="flex items-center gap-3">
              <div className={`relative flex size-3 ${isOnline ? "" : "opacity-40"}`}>
                {isOnline && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
                <span className={`relative inline-flex size-3 rounded-full ${isOnline ? "bg-emerald-500" : "bg-[#4a3525]"}`} />
              </div>
              <div>
                <p className="font-serif font-bold text-[#1e3a5f]">
                  {isOnline ? "Estás en línea" : "Estás fuera de línea"}
                </p>
                <p className="text-xs text-[#4a3525]">
                  {isOnline ? "Recibiendo pedidos en tu zona" : "Actívate para empezar a recibir pedidos"}
                </p>
              </div>
            </div>
            <Switch
              checked={isOnline}
              disabled={toggleOnline.isPending}
              onCheckedChange={(v) => toggleOnline.mutate(v)}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {!isOnline ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Radio className="mx-auto mb-3 size-8 text-[#c8862e]" />
              <p className="font-serif text-lg font-bold text-[#1e3a5f]">Ponte en línea para ver pedidos</p>
              <p className="mt-1 text-sm text-[#4a3525]">
                Solo recibirás pedidos cuando estés en línea. Puedes desconectarte cuando quieras.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <h2 className="mb-4 font-serif text-lg font-bold text-[#1e3a5f]">Pedidos disponibles</h2>

            {list.isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="size-6 animate-spin text-[#1e3a5f]" />
              </div>
            ) : (list.data?.length ?? 0) === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-sm text-[#4a3525]">
                  No hay pedidos disponibles ahora mismo. Te avisaremos cuando llegue uno.
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
                      <div className="flex gap-2">
                        <Button
                          className="h-12 flex-1 bg-[#1e3a5f] text-white hover:bg-[#0f2338]"
                          disabled={accept.isPending}
                          onClick={() => accept.mutate(o.id)}
                        >
                          {accept.isPending && accept.variables === o.id ? (
                            <><Loader2 className="mr-2 size-4 animate-spin" /> Aceptando…</>
                          ) : (
                            "Aceptar"
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          className="h-12 border-[#c8862e]/40 text-[#1e3a5f]"
                          onClick={() => setBatchOrderId(o.id)}
                          title="Ver pedidos cercanos para agrupar"
                        >
                          <Sparkles className="mr-1 size-4 text-[#c8862e]" /> Agrupar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
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
