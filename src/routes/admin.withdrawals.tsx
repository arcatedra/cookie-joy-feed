import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Shield, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/admin/withdrawals")({
  component: AdminWithdrawalsPage,
  ssr: false,
  head: () => ({
    meta: [{ title: "Admin · Retiros" }, { name: "robots", content: "noindex" }],
  }),
});

type Row = {
  id: string;
  profile_id: string;
  amount_usd: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  affiliate_name: string | null;
  affiliate_email: string | null;
};

const statusLabel = (s: string) =>
  s === "pending" ? "Pendiente" : s === "paid_out" ? "Pagado" : s === "rejected" ? "Rechazado" : s;

const statusClass = (s: string) =>
  s === "paid_out"
    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
    : s === "rejected"
      ? "bg-red-500/15 text-red-600 dark:text-red-400"
      : "bg-amber-500/15 text-amber-600 dark:text-amber-400";

function AdminWithdrawalsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [notesById, setNotesById] = useState<Record<string, string>>({});

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    (async () => {
      const { data } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      setIsAdmin(!!data);
    })();
  }, [user, loading, navigate]);

  const listQuery = useQuery({
    queryKey: ["admin-withdrawals"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_withdrawals");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const processMutation = useMutation({
    mutationFn: async (args: { id: string; action: "paid_out" | "rejected"; notes?: string }) => {
      const { error } = await supabase.rpc("admin_process_withdrawal", {
        p_withdrawal_id: args.id,
        p_action: args.action,
        p_notes: args.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.action === "paid_out" ? "Marcado como pagado" : "Solicitud rechazada");
      qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Error al procesar");
    },
  });

  if (loading || isAdmin === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg p-6 text-center">
        <Shield className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-3 text-xl font-bold">Acceso restringido</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta sección es solo para administradores.
        </p>
      </div>
    );
  }

  const rows = listQuery.data ?? [];
  const pending = rows.filter((r) => r.status === "pending");
  const history = rows.filter((r) => r.status !== "pending");

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-bold">Solicitudes de retiro</h1>
        <p className="text-sm text-muted-foreground">
          Revisa y procesa manualmente los pagos a afiliados.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pendientes ({pending.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {listQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay solicitudes pendientes.</p>
          ) : (
            pending.map((r) => (
              <div key={r.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{r.affiliate_name || "Afiliado"}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.affiliate_email || r.profile_id}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Solicitado el {new Date(r.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">${Number(r.amount_usd).toFixed(2)}</p>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${statusClass(r.status)}`}
                    >
                      {statusLabel(r.status)}
                    </span>
                  </div>
                </div>
                <Textarea
                  placeholder="Notas internas (opcional): referencia de pago, motivo de rechazo, etc."
                  className="mt-3"
                  rows={2}
                  value={notesById[r.id] ?? ""}
                  onChange={(e) => setNotesById((s) => ({ ...s, [r.id]: e.target.value }))}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    onClick={() =>
                      processMutation.mutate({
                        id: r.id,
                        action: "paid_out",
                        notes: notesById[r.id],
                      })
                    }
                    disabled={processMutation.isPending}
                    className="gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Marcar como pagado
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!confirm("¿Rechazar esta solicitud? Las comisiones volverán al saldo disponible del afiliado."))
                        return;
                      processMutation.mutate({
                        id: r.id,
                        action: "rejected",
                        notes: notesById[r.id],
                      });
                    }}
                    disabled={processMutation.isPending}
                    className="gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Rechazar
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial ({history.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin registros aún.</p>
          ) : (
            <ul className="divide-y divide-border">
              {history.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {r.affiliate_name || "Afiliado"}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        · {r.affiliate_email}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.updated_at).toLocaleString()}
                      {r.notes ? ` · ${r.notes}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${Number(r.amount_usd).toFixed(2)}</p>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${statusClass(r.status)}`}
                    >
                      {statusLabel(r.status)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
