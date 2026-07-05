import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, Loader2, MapPin, Package, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProofOfDelivery } from "@/components/ProofOfDelivery";
import {
  adminListDeliveryBookings,
  submitDeliveryProof,
  getDeliveryProofSignedUrl,
} from "@/lib/delivery-proof.functions";

export const Route = createFileRoute("/_authenticated/admin/deliveries")({
  head: () => ({
    meta: [
      { title: "Admin — Entregas" },
      { name: "description", content: "Confirma entregas con prueba fotográfica." },
    ],
  }),
  component: AdminDeliveriesPage,
});

interface Booking {
  id: string;
  user_id: string;
  scheduled_date: string;
  address: string | null;
  notes: string | null;
  status: string;
  proof_photo_path: string | null;
  proof_description: string | null;
  delivered_at: string | null;
}

function AdminDeliveriesPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListDeliveryBookings);
  const submitFn = useServerFn(submitDeliveryProof);
  const signFn = useServerFn(getDeliveryProofSignedUrl);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-delivery-bookings"],
    queryFn: () => listFn(),
  });

  const bookings = (data?.bookings ?? []) as Booking[];
  const scheduled = bookings.filter((b) => b.status === "scheduled");
  const delivered = bookings.filter((b) => b.status === "delivered");

  async function handleSubmitProof(b: Booking, args: { fotoFile: File; descripcion: string }) {
    const ext = args.fotoFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${b.user_id}/${b.id}-${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("delivery-proofs")
      .upload(path, args.fotoFile, {
        contentType: args.fotoFile.type || "image/jpeg",
        upsert: false,
      });
    if (upErr) throw upErr;

    await submitFn({
      data: { bookingId: b.id, photoPath: path, description: args.descripcion },
    });

    toast.success("Entrega confirmada");
    qc.invalidateQueries({ queryKey: ["admin-delivery-bookings"] });
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Link to="/" className="rounded-full p-2 hover:bg-muted">
            <ChevronLeft className="size-5" />
          </Link>
          <h1 className="text-lg font-semibold">Entregas — Admin</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Cargando…
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="size-4" /> Entregas pendientes ({scheduled.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {scheduled.length === 0 && !isLoading ? (
              <p className="text-sm text-muted-foreground">No hay entregas pendientes.</p>
            ) : (
              scheduled.map((b) => (
                <div key={b.id} className="rounded-xl border p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {new Date(`${b.scheduled_date}T12:00:00`).toLocaleDateString("es-ES", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </p>
                      {b.address && (
                        <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                          <MapPin className="mt-0.5 size-3 shrink-0" />
                          <span>{b.address}</span>
                        </p>
                      )}
                      {b.notes && (
                        <p className="mt-1 text-xs italic text-muted-foreground">"{b.notes}"</p>
                      )}
                    </div>
                    <Badge variant="secondary">Pendiente</Badge>
                  </div>
                  <ProofOfDelivery
                    onSubmit={(args) => handleSubmitProof(b, args)}
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="size-4" /> Entregadas recientes ({delivered.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {delivered.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay entregas confirmadas.</p>
            ) : (
              <ul className="divide-y">
                {delivered.slice(0, 20).map((b) => (
                  <DeliveredRow key={b.id} booking={b} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function DeliveredRow({ booking }: { booking: Booking }) {
  const signFn = useServerFn(getDeliveryProofSignedUrl);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const view = async () => {
    if (url || !booking.proof_photo_path) return;
    setLoading(true);
    try {
      const res = await signFn({ data: { path: booking.proof_photo_path } });
      setUrl(res.url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cargar la foto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <li className="flex items-start gap-3 py-3">
      <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-md bg-muted">
        {url ? (
          <img src={url} alt="Prueba" className="h-full w-full object-cover" />
        ) : (
          <button
            type="button"
            onClick={view}
            className="text-[10px] text-muted-foreground hover:text-foreground"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Ver foto"}
          </button>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {new Date(`${booking.scheduled_date}T12:00:00`).toLocaleDateString("es-ES", {
            day: "numeric",
            month: "long",
          })}
        </p>
        {booking.proof_description && (
          <p className="text-xs text-muted-foreground">{booking.proof_description}</p>
        )}
        {booking.delivered_at && (
          <p className="text-[10px] text-muted-foreground/70">
            Entregada {new Date(booking.delivered_at).toLocaleString("es-ES")}
          </p>
        )}
      </div>
    </li>
  );
}
