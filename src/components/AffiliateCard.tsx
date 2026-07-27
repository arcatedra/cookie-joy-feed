import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Wallet, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Commission = {
  id: string;
  amount_usd: number;
  status: string;
  cliente_email: string | null;
  created_at: string;
};

type Withdrawal = {
  id: string;
  amount_usd: number;
  status: string;
  created_at: string;
};

const statusLabel = (s: string) => {
  switch (s) {
    case "pending":
      return "Pendiente";
    case "available":
      return "Disponible";
    case "requested":
      return "Solicitado";
    case "paid_out":
    case "paid":
      return "Pagado";
    case "rejected":
      return "Rechazado";
    default:
      return s;
  }
};

const statusClass = (s: string) => {
  if (s === "paid_out" || s === "paid") return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  if (s === "rejected") return "bg-red-500/15 text-red-600 dark:text-red-400";
  if (s === "requested") return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  return "bg-primary/10 text-primary";
};

export function AffiliateCard() {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const commissionsQuery = useQuery({
    queryKey: ["affiliate-commissions", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_commissions")
        .select("id, amount_usd, status, cliente_email, created_at")
        .eq("affiliate_profile_id", uid!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Commission[];
    },
  });

  const withdrawalsQuery = useQuery({
    queryKey: ["affiliate-withdrawals", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("id, amount_usd, status, created_at")
        .eq("profile_id", uid!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Withdrawal[];
    },
  });

  const requestMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("request_affiliate_withdrawal");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Solicitud de retiro enviada. Nuestro equipo la revisará.");
      qc.invalidateQueries({ queryKey: ["affiliate-commissions", uid] });
      qc.invalidateQueries({ queryKey: ["affiliate-withdrawals", uid] });
      setConfirming(false);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "No se pudo solicitar el retiro";
      toast.error(msg);
    },
  });

  const commissions = commissionsQuery.data ?? [];
  const withdrawals = withdrawalsQuery.data ?? [];

  const available = useMemo(
    () =>
      commissions
        .filter((c) => c.status === "available")
        .reduce((sum, c) => sum + Number(c.amount_usd || 0), 0),
    [commissions],
  );


  const totalEarned = useMemo(
    () => commissions.reduce((sum, c) => sum + Number(c.amount_usd || 0), 0),
    [commissions],
  );

  const canRequest = available > 0 && !requestMutation.isPending;

  return (
    <section className="mt-6 px-5">
      <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-foreground">
        Programa de Afiliados
      </h3>

      <div className="mt-3 rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-primary/5 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Wallet className="h-4 w-4" /> Saldo disponible
            </div>
            <p className="mt-2 text-2xl font-bold text-card-foreground">
              ${available.toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl bg-accent p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <DollarSign className="h-4 w-4" /> Ganado total
            </div>
            <p className="mt-2 text-2xl font-bold text-card-foreground">
              ${totalEarned.toFixed(2)}
            </p>
          </div>
        </div>

        {confirming ? (
          <div className="mt-4 rounded-xl border border-border bg-background p-3">
            <p className="text-sm text-card-foreground">
              ¿Solicitar retiro de <strong>${available.toFixed(2)}</strong>? Nuestro equipo lo
              revisará y te pagará manualmente.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => requestMutation.mutate()}
                disabled={!canRequest}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {requestMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={requestMutation.isPending}
                className="flex-1 rounded-full border border-border bg-card py-2.5 text-sm font-semibold text-card-foreground"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={!canRequest}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground shadow disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Solicitar retiro
          </button>
        )}

        {available <= 0 && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Aún no tienes comisiones disponibles para retirar.
          </p>
        )}

        {/* Withdrawal history */}
        {withdrawals.length > 0 && (
          <div className="mt-5">
            <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Retiros solicitados
            </h4>
            <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
              {withdrawals.map((w) => (
                <li key={w.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div>
                    <p className="font-semibold text-card-foreground">
                      ${Number(w.amount_usd).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(w.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${statusClass(w.status)}`}>
                    {statusLabel(w.status)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Commission history */}
        <div className="mt-5">
          <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Historial de comisiones
          </h4>
          {commissionsQuery.isLoading ? (
            <p className="mt-2 text-sm text-muted-foreground">Cargando…</p>
          ) : commissions.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Aún no tienes comisiones. Comparte tu enlace de invitación para empezar a ganar $5
              por cada suscripción activada.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
              {commissions.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-card-foreground">
                      {c.cliente_email ?? "Cliente referido"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-card-foreground">
                      ${Number(c.amount_usd).toFixed(2)}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${statusClass(c.status)}`}>
                      {statusLabel(c.status)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
