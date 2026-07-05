import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, FileText, Star, Phone, Mail, MapPin, ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  listDriversForReview,
  getDriverForReview,
  approveDriver,
  rejectDriver,
  reviewDocument,
} from "@/lib/admin-drivers.functions";

export const Route = createFileRoute("/_authenticated/admin/repartidores")({
  component: AdminRepartidores,
});

type Status = "pendiente" | "aprobado" | "rechazado";

function AdminRepartidores() {
  const [tab, setTab] = useState<Status>("pendiente");
  const [selected, setSelected] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["admin-drivers", tab],
    queryFn: () => listDriversForReview({ data: { status: tab } }),
  });

  return (
    <div className="min-h-screen bg-[#f4f1ea] pb-16">
      <header className="flex items-center gap-3 border-b border-[#c8862e]/30 bg-white p-4">
        <Link to="/" className="text-[#1e3a5f]">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-serif text-xl font-bold text-[#1e3a5f]">Administrar repartidores</h1>
      </header>

      <div className="mx-auto max-w-4xl p-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Status)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pendiente">Pendientes</TabsTrigger>
            <TabsTrigger value="aprobado">Aprobados</TabsTrigger>
            <TabsTrigger value="rechazado">Rechazados</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4 space-y-2">
            {list.isLoading && <Loader2 className="mx-auto size-6 animate-spin text-[#1e3a5f]" />}
            {list.data?.length === 0 && (
              <p className="rounded-lg bg-white p-6 text-center text-sm text-[#4a3525]/70">
                No hay repartidores en este estado.
              </p>
            )}
            {list.data?.map((d) => (
              <Card key={d.id} className="border-[#c8862e]/30 bg-white">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-[#1e3a5f]">{d.full_name}</p>
                      {d.is_online && (
                        <Badge className="bg-emerald-500 text-white">● En línea</Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-[#4a3525]/70">{d.email} · {d.phone}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-[#4a3525]">
                      {d.city && <span className="flex items-center gap-1"><MapPin className="size-3" /> {d.city}</span>}
                      {d.rating != null && d.rating > 0 && (
                        <span className="flex items-center gap-1"><Star className="size-3 fill-[#E6C35C] text-[#E6C35C]" /> {Number(d.rating).toFixed(2)}</span>
                      )}
                    </div>
                    {d.rejection_reason && (
                      <p className="mt-1 text-xs text-red-700">Motivo: {d.rejection_reason}</p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setSelected(d.id)}>
                    Revisar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {selected && (
        <DriverReviewDialog
          driverId={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function DriverReviewDialog({ driverId, onClose }: { driverId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const detail = useQuery({
    queryKey: ["admin-driver", driverId],
    queryFn: () => getDriverForReview({ data: { driverId } }),
  });

  const approveFn = useServerFn(approveDriver);
  const rejectFn = useServerFn(rejectDriver);
  const reviewDocFn = useServerFn(reviewDocument);

  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  const approve = useMutation({
    mutationFn: () => approveFn({ data: { driverId } }),
    onSuccess: () => {
      toast.success("Repartidor aprobado");
      qc.invalidateQueries({ queryKey: ["admin-drivers"] });
      qc.invalidateQueries({ queryKey: ["admin-driver", driverId] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const reject = useMutation({
    mutationFn: () => rejectFn({ data: { driverId, reason: rejectReason } }),
    onSuccess: () => {
      toast.success("Repartidor rechazado");
      qc.invalidateQueries({ queryKey: ["admin-drivers"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const reviewDoc = useMutation({
    mutationFn: (args: { documentId: string; action: "aprobar" | "rechazar"; reason?: string }) =>
      reviewDocFn({ data: args }),
    onSuccess: () => {
      toast.success("Documento actualizado");
      qc.invalidateQueries({ queryKey: ["admin-driver", driverId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisión de repartidor</DialogTitle>
        </DialogHeader>

        {detail.isLoading && <Loader2 className="mx-auto size-6 animate-spin text-[#1e3a5f]" />}
        {detail.data && (
          <div className="space-y-4">
            <div className="rounded-lg bg-[#f4f1ea] p-4">
              <p className="text-lg font-bold text-[#1e3a5f]">{detail.data.driver.full_name}</p>
              <div className="mt-1 space-y-1 text-sm text-[#4a3525]">
                <p className="flex items-center gap-2"><Mail className="size-3.5" /> {detail.data.driver.email}</p>
                <p className="flex items-center gap-2"><Phone className="size-3.5" /> {detail.data.driver.phone}</p>
                {detail.data.driver.city && <p className="flex items-center gap-2"><MapPin className="size-3.5" /> {detail.data.driver.city}, {detail.data.driver.address}</p>}
                <p>Nacimiento: {detail.data.driver.date_of_birth}</p>
              </div>
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-[#1e3a5f]">Vehículos</h3>
              {detail.data.vehicles.length === 0 && <p className="text-sm text-[#4a3525]/70">No hay vehículos registrados.</p>}
              {detail.data.vehicles.map((v) => (
                <div key={v.id} className="rounded-lg border border-[#c8862e]/30 bg-white p-3 text-sm">
                  <p className="font-medium">{v.vehicle_type} — {v.brand} {v.model} {v.year}</p>
                  <p className="text-xs text-[#4a3525]/70">Placa: {v.plate_number || "—"}</p>
                  {v.vehicle_photo_url && (
                    <a href={v.vehicle_photo_url} target="_blank" rel="noopener" className="mt-1 inline-flex items-center gap-1 text-xs text-[#1e3a5f] underline">
                      Ver foto <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-[#1e3a5f]">Documentos (KYC)</h3>
              {detail.data.documents.length === 0 && <p className="text-sm text-[#4a3525]/70">No hay documentos subidos.</p>}
              <div className="space-y-2">
                {detail.data.documents.map((doc) => (
                  <div key={doc.id} className="rounded-lg border border-[#c8862e]/30 bg-white p-3">
                    <div className="flex items-center justify-between">
                      <p className="flex items-center gap-2 text-sm font-medium text-[#1e3a5f]">
                        <FileText className="size-4" /> {doc.document_type.replace(/_/g, " ")}
                      </p>
                      <Badge
                        className={
                          doc.status === "aprobado"
                            ? "bg-emerald-500 text-white"
                            : doc.status === "rechazado"
                              ? "bg-red-500 text-white"
                              : "bg-[#E6C35C] text-[#1e3a5f]"
                        }
                      >
                        {doc.status}
                      </Badge>
                    </div>
                    {doc.expiration_date && (
                      <p className="mt-1 text-xs text-[#4a3525]/70">Vence: {doc.expiration_date}</p>
                    )}
                    {doc.rejection_reason && (
                      <p className="mt-1 text-xs text-red-700">Motivo: {doc.rejection_reason}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex items-center gap-1 text-xs text-[#1e3a5f] underline"
                      >
                        Ver archivo <ExternalLink className="size-3" />
                      </a>
                      {doc.status !== "aprobado" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                          disabled={reviewDoc.isPending}
                          onClick={() => reviewDoc.mutate({ documentId: doc.id, action: "aprobar" })}
                        >
                          <CheckCircle2 className="mr-1 size-3.5" /> Aprobar
                        </Button>
                      )}
                      {doc.status !== "rechazado" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500 text-red-700 hover:bg-red-50"
                          disabled={reviewDoc.isPending}
                          onClick={() => {
                            const reason = prompt("Motivo del rechazo:");
                            if (reason && reason.trim()) reviewDoc.mutate({ documentId: doc.id, action: "rechazar", reason: reason.trim() });
                          }}
                        >
                          <XCircle className="mr-1 size-3.5" /> Rechazar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {detail.data.driver.application_status === "pendiente" && (
              <div className="sticky bottom-0 flex gap-2 border-t bg-white pt-3">
                <Button
                  variant="outline"
                  className="flex-1 border-red-500 text-red-700 hover:bg-red-50"
                  onClick={() => setShowReject(true)}
                >
                  <XCircle className="mr-2 size-4" /> Rechazar
                </Button>
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  disabled={approve.isPending}
                  onClick={() => approve.mutate()}
                >
                  {approve.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}
                  Aprobar repartidor
                </Button>
              </div>
            )}

            {showReject && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="mb-2 text-sm font-medium text-red-700">Motivo del rechazo</p>
                <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} />
                <div className="mt-2 flex gap-2">
                  <Button variant="ghost" className="flex-1" onClick={() => setShowReject(false)}>
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={!rejectReason.trim() || reject.isPending}
                    onClick={() => reject.mutate()}
                  >
                    {reject.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Confirmar rechazo
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
