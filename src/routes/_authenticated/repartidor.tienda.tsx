import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, Store, MapPin, Package, Camera } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  advanceStoreDelivery,
  claimStoreOrder,
  listDriverStoreOrders,
  type DeliveryCard,
} from "@/lib/store-delivery.functions";

export const Route = createFileRoute("/_authenticated/repartidor/tienda")({
  head: () => ({
    meta: [
      { title: "Pedidos de tienda — Repartidor Hazorex" },
      { name: "description", content: "Toma pedidos de supermercado listos para entregar." },
      { property: "og:title", content: "Pedidos de tienda — Repartidor Hazorex" },
      { property: "og:description", content: "Toma pedidos de supermercado listos para entregar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DriverStorePage,
  errorComponent: ({ error }) => <div className="p-6 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-6 text-sm">No encontrado</div>,
});

const money = (n: number) => `$${n.toFixed(2)}`;
const NEXT: Record<string, { step: "recogido" | "en_camino" | "entregado"; label: string }> = {
  tomado: { step: "recogido", label: "Ya lo recogí en la tienda" },
  recogido: { step: "en_camino", label: "Voy en camino" },
  en_camino: { step: "entregado", label: "Entregado (subir foto)" },
};
const STEP_LABEL: Record<string, string> = {
  tomado: "Tomado",
  recogido: "Recogido en tienda",
  en_camino: "En camino",
};

function DriverStorePage() {
  const fetchList = useServerFn(listDriverStoreOrders);
  const claim = useServerFn(claimStoreOrder);
  const advance = useServerFn(advanceStoreDelivery);
  const [busy, setBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoFor, setPhotoFor] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["driver-store-orders"],
    queryFn: () => fetchList(),
    refetchInterval: 30_000,
  });

  async function onClaim(id: string) {
    setBusy(id);
    try {
      await claim({ data: { id } });
      toast.success("Pedido tomado. Ve a la tienda a recogerlo.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo tomar");
    } finally {
      setBusy(null);
      refetch();
    }
  }

  async function onAdvance(c: DeliveryCard) {
    const next = NEXT[c.estadoEntrega ?? ""];
    if (!next) return;
    if (next.step === "entregado") {
      setPhotoFor(c.id);
      fileRef.current?.click();
      return;
    }
    setBusy(c.id);
    try {
      await advance({ data: { id: c.id, step: next.step } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar");
    } finally {
      setBusy(null);
      refetch();
    }
  }

  async function onPhoto(file: File | undefined) {
    const id = photoFor;
    if (!file || !id) return;
    setBusy(id);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Inicia sesión de nuevo.");
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().slice(0, 5);
      const path = `${u.user.id}/${id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("delivery-photos")
        .upload(path, file, { contentType: file.type || "image/jpeg" });
      if (upErr) throw new Error("No se pudo subir la foto.");
      const res = await advance({ data: { id, step: "entregado", photoPath: path } });
      toast.success(
        res.pagado
          ? "¡Entregado! Tu pago ya se envió a tu cuenta."
          : "¡Entregado! Tu pago quedó registrado; se envía cuando tu cuenta de cobro esté lista.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo marcar entregado");
    } finally {
      setBusy(null);
      setPhotoFor(null);
      if (fileRef.current) fileRef.current.value = "";
      refetch();
    }
  }

  const groups = new Map<string, DeliveryCard[]>();
  for (const c of data?.disponibles ?? []) {
    const k = c.zip || c.zona || "Sin código postal";
    groups.set(k, [...(groups.get(k) ?? []), c]);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onPhoto(e.target.files?.[0])}
      />
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pedidos de tienda</h1>
          <p className="text-sm text-muted-foreground">Toma un pedido listo y llévalo al cliente.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
        </Button>
      </header>

      {isLoading ? (
        <div className="flex justify-center p-10">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">
          {(error as Error).message}{" "}
          <button className="underline" onClick={() => refetch()}>
            Reintentar
          </button>
        </p>
      ) : !data?.aprobado ? (
        <p className="rounded-2xl border p-6 text-sm text-muted-foreground">
          Podrás ver pedidos cuando tu postulación esté aprobada.
        </p>
      ) : (
        <>
          {(data.mios ?? []).length > 0 && (
            <section className="space-y-3">
              <h2 className="font-semibold">Mis pedidos en curso</h2>
              {data.mios.map((c) => (
                <article key={c.id} className="space-y-2 rounded-2xl border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">#{c.numero}</span>
                    <span className="rounded-full bg-muted px-2 py-1 text-xs">
                      {STEP_LABEL[c.estadoEntrega ?? ""] ?? c.estadoEntrega}
                    </span>
                  </div>
                  <p className="flex items-center gap-2 text-sm">
                    <Store className="h-4 w-4" /> {c.tienda} — {c.tiendaDireccion}
                  </p>
                  <p className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4" /> {c.clienteDireccion}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {c.articulos} artículos · {c.pesoLb} lb · Ganas {money(c.gananciaUsd)}
                  </p>
                  {NEXT[c.estadoEntrega ?? ""] && (
                    <Button className="w-full" disabled={busy === c.id} onClick={() => onAdvance(c)}>
                      {busy === c.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          {c.estadoEntrega === "en_camino" && <Camera className="mr-2 h-4 w-4" />}
                          {NEXT[c.estadoEntrega ?? ""].label}
                        </>
                      )}
                    </Button>
                  )}
                </article>
              ))}
            </section>
          )}

          <section className="space-y-4">
            <h2 className="font-semibold">Disponibles</h2>
            {groups.size === 0 ? (
              <p className="rounded-2xl border p-6 text-sm text-muted-foreground">
                No hay pedidos disponibles en tu zona ahora mismo.
              </p>
            ) : (
              [...groups.entries()].map(([zip, cards]) => (
                <div key={zip} className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Código postal {zip}</h3>
                  {cards.map((c) => (
                    <article key={c.id} className="space-y-2 rounded-2xl border bg-card p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{c.tienda}</span>
                        <span className="text-lg font-bold">{money(c.gananciaUsd)}</span>
                      </div>
                      <p className="flex items-center gap-2 text-sm">
                        <Store className="h-4 w-4" /> {c.tiendaDireccion || "Dirección de la tienda"}
                      </p>
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Package className="h-4 w-4" /> {c.zona} · {c.pesoLb} lb · {c.articulos} artículos
                      </p>
                      <Button className="w-full" disabled={busy === c.id} onClick={() => onClaim(c.id)}>
                        {busy === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tomar pedido"}
                      </Button>
                    </article>
                  ))}
                </div>
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}
