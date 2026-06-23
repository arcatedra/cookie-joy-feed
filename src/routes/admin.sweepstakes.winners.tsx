import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Shield, ExternalLink, FileText, IdCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  listWinnerClaims,
  getWinnerClaimDetails,
  approveWinnerClaim,
  rejectWinnerClaim,
  markWinnerClaimPaid,
} from "@/lib/admin-claims.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/sweepstakes/winners")({
  component: AdminWinnersPage,
  ssr: false,
  head: () => ({
    meta: [{ title: "Admin · Reclamos de ganadores" }, { name: "robots", content: "noindex" }],
  }),
});

type StatusFilter =
  | "all"
  | "pending_verification"
  | "submitted"
  | "verified"
  | "paid"
  | "rejected"
  | "expired";

const STATUS_COLORS: Record<string, string> = {
  pending_verification: "bg-amber-100 text-amber-900 border-amber-300",
  submitted: "bg-blue-100 text-blue-900 border-blue-300",
  verified: "bg-emerald-100 text-emerald-900 border-emerald-300",
  paid: "bg-green-100 text-green-900 border-green-400",
  rejected: "bg-red-100 text-red-900 border-red-300",
  expired: "bg-zinc-100 text-zinc-700 border-zinc-300",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded border px-2 py-0.5 text-xs font-semibold ${
        STATUS_COLORS[status] ?? "bg-zinc-100 text-zinc-700 border-zinc-300"
      }`}
    >
      {status}
    </span>
  );
}

function AdminWinnersPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("submitted");
  const [openDate, setOpenDate] = useState<string | null>(null);

  const listFn = useServerFn(listWinnerClaims);
  const detailFn = useServerFn(getWinnerClaimDetails);
  const approveFn = useServerFn(approveWinnerClaim);
  const rejectFn = useServerFn(rejectWinnerClaim);
  const payFn = useServerFn(markWinnerClaimPaid);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        if (!cancelled) navigate({ to: "/auth" });
        return;
      }
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: u.user.id,
        _role: "admin",
      });
      if (!cancelled) setAllowed(Boolean(isAdmin));
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const list = useQuery({
    queryKey: ["admin", "winner-claims", statusFilter],
    queryFn: () => listFn({ data: { status: statusFilter, limit: 100, offset: 0 } }),
    enabled: allowed === true,
  });

  const detail = useQuery({
    queryKey: ["admin", "winner-claim-detail", openDate],
    queryFn: () => detailFn({ data: { drawDate: openDate! } }),
    enabled: !!openDate && allowed === true,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", "winner-claims"] });
    qc.invalidateQueries({ queryKey: ["admin", "winner-claim-detail", openDate] });
  };

  const [adminNotes, setAdminNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [paymentRef, setPaymentRef] = useState("");

  useEffect(() => {
    setAdminNotes("");
    setRejectReason("");
    setPaymentRef("");
  }, [openDate]);

  const approve = useMutation({
    mutationFn: () => approveFn({ data: { drawDate: openDate!, notes: adminNotes || undefined } }),
    onSuccess: (res) => {
      if (!res.ok) return toast.error(res.error);
      toast.success("Reclamo aprobado");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: () => rejectFn({ data: { drawDate: openDate!, reason: rejectReason } }),
    onSuccess: (res) => {
      if (!res.ok) return toast.error(res.error);
      toast.success("Reclamo rechazado");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pay = useMutation({
    mutationFn: () => payFn({ data: { drawDate: openDate!, paymentReference: paymentRef } }),
    onSuccess: (res) => {
      if (!res.ok) return toast.error(res.error);
      toast.success("Pago registrado");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (allowed === null)
    return <div className="p-6 text-sm text-muted-foreground">Cargando…</div>;
  if (!allowed)
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Acceso restringido</AlertTitle>
          <AlertDescription>Solo administradores.</AlertDescription>
        </Alert>
      </div>
    );

  const rows = list.data?.rows ?? [];
  const d = detail.data;

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reclamos de ganadores</h1>
          <p className="text-sm text-muted-foreground">
            Revisa documentos (ID + W-9), aprueba o rechaza, y marca pagos.
          </p>
        </div>
        <Link to="/admin/sweepstakes" className="text-sm underline text-muted-foreground">
          ← Volver a configuración
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Reclamos</CardTitle>
            <CardDescription>
              {list.isLoading ? "Cargando…" : `${list.data?.total ?? 0} en total`}
            </CardDescription>
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-[240px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending_verification">Pendientes (sin enviar)</SelectItem>
              <SelectItem value="submitted">Enviados — revisar</SelectItem>
              <SelectItem value="verified">Verificados — pagar</SelectItem>
              <SelectItem value="paid">Pagados</SelectItem>
              <SelectItem value="rejected">Rechazados</SelectItem>
              <SelectItem value="expired">Expirados</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha sorteo</TableHead>
                <TableHead>Ganador</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Premio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Enviado</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && !list.isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                    Sin reclamos en este filtro.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => setOpenDate(r.draw_date)}>
                  <TableCell className="font-mono text-xs">{r.draw_date}</TableCell>
                  <TableCell>{r.display_name ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.email}</TableCell>
                  <TableCell className="text-right font-semibold">
                    ${Number(r.prize_usd).toFixed(2)}
                  </TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-xs">
                    {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.claim_deadline ? new Date(r.claim_deadline).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">Ver →</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!openDate} onOpenChange={(o) => !o && setOpenDate(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Reclamo {openDate}</SheetTitle>
            <SheetDescription>
              {detail.isLoading ? "Cargando…" : d ? `Ganador: ${d.display_name ?? "—"}` : "Sin datos"}
            </SheetDescription>
          </SheetHeader>

          {d && (
            <div className="mt-6 space-y-6">
              <div className="rounded-lg border p-4 bg-muted/30">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs text-muted-foreground">Premio</div>
                    <div className="text-3xl font-bold">${Number(d.prize_usd).toFixed(2)}</div>
                  </div>
                  <StatusBadge status={d.status as string} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Email:</span> {d.email}</div>
                  <div><span className="text-muted-foreground">Notificado:</span> {d.notified_at ? new Date(d.notified_at as string).toLocaleString() : "—"}</div>
                  <div><span className="text-muted-foreground">Enviado:</span> {d.submitted_at ? new Date(d.submitted_at as string).toLocaleString() : "—"}</div>
                  <div><span className="text-muted-foreground">Deadline:</span> {d.claim_deadline ? new Date(d.claim_deadline as string).toLocaleString() : "—"}</div>
                </div>
              </div>

              {d.submitted_at && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Datos KYC</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm rounded-lg border p-3">
                    <div><span className="text-muted-foreground text-xs">Nombre legal</span><div>{d.full_name ?? "—"}</div></div>
                    <div><span className="text-muted-foreground text-xs">DOB</span><div>{d.dob ?? "—"}</div></div>
                    <div className="col-span-2"><span className="text-muted-foreground text-xs">Dirección</span><div>{[d.address1, d.address2, d.city, d.state, d.zip].filter(Boolean).join(", ")}</div></div>
                    <div><span className="text-muted-foreground text-xs">Teléfono</span><div>{d.phone ?? "—"}</div></div>
                    <div><span className="text-muted-foreground text-xs">Pago</span><div>{d.payment_method} → {d.payment_destination}</div></div>
                  </div>
                </div>
              )}

              {(d.id_document_url || d.w9_document_url) && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Documentos (link válido 10 min)</h3>
                  <div className="flex gap-2 flex-wrap">
                    {d.id_document_url && (
                      <a href={d.id_document_url as string} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm"><IdCard className="h-4 w-4 mr-1" /> Ver ID <ExternalLink className="h-3 w-3 ml-1" /></Button>
                      </a>
                    )}
                    {d.w9_document_url && (
                      <a href={d.w9_document_url as string} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm"><FileText className="h-4 w-4 mr-1" /> Ver W-9 <ExternalLink className="h-3 w-3 ml-1" /></Button>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {(d.status === "submitted" || d.status === "pending_verification") && (
                <div className="space-y-3 rounded-lg border p-3">
                  <h3 className="font-semibold text-sm">Aprobar o rechazar</h3>
                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-xs">Notas internas (opcional)</Label>
                    <Textarea id="notes" rows={2} value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Visto en sistema..." />
                  </div>
                  <Button onClick={() => approve.mutate()} disabled={approve.isPending || !d.submitted_at} className="w-full">
                    {approve.isPending ? "Aprobando…" : "✓ Aprobar reclamo"}
                  </Button>
                  {!d.submitted_at && <p className="text-xs text-muted-foreground">El ganador aún no completó el formulario, no se puede aprobar.</p>}
                  <div className="border-t pt-3 space-y-2">
                    <Label htmlFor="reason" className="text-xs">Motivo de rechazo</Label>
                    <Textarea id="reason" rows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Documento ilegible / no coincide..." />
                    <Button variant="destructive" onClick={() => reject.mutate()} disabled={reject.isPending || rejectReason.trim().length < 3} className="w-full">
                      {reject.isPending ? "Rechazando…" : "✗ Rechazar reclamo"}
                    </Button>
                  </div>
                </div>
              )}

              {d.status === "verified" && (
                <div className="space-y-3 rounded-lg border p-3 bg-emerald-50/30">
                  <h3 className="font-semibold text-sm">Registrar pago</h3>
                  <Label htmlFor="ref" className="text-xs">Referencia (txid, número de cheque, etc.)</Label>
                  <Input id="ref" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="PayPal txn ID, cheque #..." />
                  <Button onClick={() => pay.mutate()} disabled={pay.isPending || paymentRef.trim().length < 2} className="w-full">
                    {pay.isPending ? "Guardando…" : "💸 Marcar como pagado"}
                  </Button>
                </div>
              )}

              {d.status === "paid" && (
                <Alert>
                  <AlertTitle>Pagado</AlertTitle>
                  <AlertDescription>
                    Referencia: <code>{d.payment_reference}</code>
                    <br />
                    Fecha: {d.paid_at ? new Date(d.paid_at as string).toLocaleString() : "—"}
                  </AlertDescription>
                </Alert>
              )}

              {d.status === "rejected" && (
                <Alert variant="destructive">
                  <AlertTitle>Rechazado</AlertTitle>
                  <AlertDescription>{d.rejection_reason ?? "Sin motivo registrado"}</AlertDescription>
                </Alert>
              )}

              {d.admin_notes && (
                <div className="text-xs rounded border p-2 bg-muted/40">
                  <span className="font-semibold">Notas:</span> {d.admin_notes}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
