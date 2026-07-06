import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  Wallet,
  Zap,
  ChevronLeft,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import {
  getRouteWallet,
  requestRoutePayout,
  createStripeConnectOnboarding,
  refreshStripeConnectStatus,
} from "@/lib/route-wallet.functions";

export const Route = createFileRoute("/_authenticated/repartidor/ganancias")({
  head: () => ({
    meta: [
      { title: "Mis ganancias — Hazorex" },
      { name: "description", content: "Tu saldo y retiros instantáneos." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EarningsPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6 text-sm">No encontrado</div>,
});

function fmt(n: number) {
  return `$${Number(n).toFixed(2)}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  return `hace ${d}d`;
}

function EarningsPage() {
  const qc = useQueryClient();
  const [payoutOpen, setPayoutOpen] = useState(false);

  const walletQ = useQuery({
    queryKey: ["route-wallet"],
    queryFn: () => getRouteWallet(),
  });

  const onboardFn = useServerFn(createStripeConnectOnboarding);
  const refreshFn = useServerFn(refreshStripeConnectStatus);

  async function handleConnect() {
    try {
      const origin = window.location.origin;
      const res = await onboardFn({
        data: {
          return_url: `${origin}/repartidor/ganancias?stripe=return`,
          refresh_url: `${origin}/repartidor/ganancias?stripe=refresh`,
        },
      });
      window.location.href = res.url;
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo iniciar la configuración");
    }
  }

  async function handleRefreshStatus() {
    try {
      await refreshFn({});
      await qc.invalidateQueries({ queryKey: ["route-wallet"] });
      toast.success("Estado actualizado");
    } catch (e: any) {
      toast.error(e.message ?? "Error");
    }
  }

  if (walletQ.isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (walletQ.error) {
    return (
      <div className="p-6 text-sm text-destructive">
        {(walletQ.error as Error).message}
      </div>
    );
  }

  const data = walletQ.data!;
  const canPayout =
    data.stripe.payouts_enabled &&
    !data.hasPendingPayout &&
    data.wallet.available_balance >= data.constants.min_payout;

  return (
    <div className="min-h-screen bg-[#f4f1ea]">
      <header className="border-b border-[#c8862e]/30 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-4">
          <Link to="/repartidor" className="text-[#4a3525] hover:text-[#1e3a5f]">
            <ChevronLeft className="size-5" />
          </Link>
          <Wallet className="size-6 text-[#1e3a5f]" />
          <h1 className="font-serif text-xl font-bold text-[#1e3a5f]">
            Mis ganancias
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        {/* Saldo hero */}
        <div className="rounded-2xl bg-gradient-to-br from-[#1e3a5f] to-[#0f2338] p-6 text-white shadow-lg">
          <p className="text-xs uppercase tracking-wider text-[#E6C35C]">
            Saldo disponible
          </p>
          <p className="mt-1 font-serif text-4xl font-bold">
            {fmt(data.wallet.available_balance)}
          </p>
          <p className="mt-1 text-xs text-white/60">
            Total histórico: {fmt(data.wallet.lifetime_earnings)}
          </p>

          <button
            onClick={() => setPayoutOpen(true)}
            disabled={!canPayout}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#c8862e] px-4 py-3 font-bold text-white transition hover:bg-[#a86e1f] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Zap className="h-4 w-4" />
            Retirar ahora
          </button>
          {data.hasPendingPayout && (
            <p className="mt-2 text-center text-xs text-[#E6C35C]">
              Tienes un retiro en proceso
            </p>
          )}
          {!data.stripe.payouts_enabled && (
            <p className="mt-2 text-center text-xs text-white/70">
              Conecta tu cuenta bancaria para poder retirar
            </p>
          )}
          {data.stripe.payouts_enabled &&
            !data.hasPendingPayout &&
            data.wallet.available_balance < data.constants.min_payout && (
              <p className="mt-2 text-center text-xs text-white/70">
                Mínimo de retiro: {fmt(data.constants.min_payout)}
              </p>
            )}
        </div>

        {/* Stripe Connect status */}
        <div className="rounded-xl border border-[#c8862e]/30 bg-white p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#f4f1ea] text-[#1e3a5f]">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#1e3a5f]">Cuenta bancaria</span>
                {data.stripe.payouts_enabled ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                    <CheckCircle2 className="h-3 w-3" /> Verificada
                  </span>
                ) : data.stripe.connected ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                    <AlertCircle className="h-3 w-3" /> Pendiente
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    Sin conectar
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Necesitas conectar tu tarjeta de débito o cuenta bancaria para
                recibir tus retiros al instante.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleConnect}
                  className="rounded-lg bg-[#1e3a5f] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#0f2338]"
                >
                  {data.stripe.connected
                    ? "Completar configuración"
                    : "Conectar cuenta"}
                </button>
                {data.stripe.connected && (
                  <button
                    onClick={handleRefreshStatus}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#c8862e]/40 px-3 py-1.5 text-xs font-bold text-[#4a3525] hover:bg-[#f4f1ea]"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Refrescar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Retiros recientes */}
        <section className="rounded-xl border border-[#c8862e]/30 bg-white">
          <div className="border-b border-[#c8862e]/20 px-4 py-3">
            <h2 className="font-bold text-[#1e3a5f]">Retiros recientes</h2>
          </div>
          {data.payouts.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Aún no has hecho retiros.
            </p>
          ) : (
            <ul className="divide-y divide-[#c8862e]/10">
              {data.payouts.map((p: any) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 px-4 py-3 text-sm"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-[#1e3a5f]">
                      {fmt(p.amount_net)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Solicitado {fmt(p.amount_requested)} · comisión{" "}
                      {fmt(p.fee)} ·{" "}
                      {new Date(p.requested_at).toLocaleDateString()}
                    </div>
                    {p.stripe_error && (
                      <div className="mt-0.5 text-xs text-red-600">
                        {p.stripe_error}
                      </div>
                    )}
                  </div>
                  <StatusBadge status={p.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Movimientos */}
        <section className="rounded-xl border border-[#c8862e]/30 bg-white">
          <div className="border-b border-[#c8862e]/20 px-4 py-3">
            <h2 className="font-bold text-[#1e3a5f]">Movimientos</h2>
          </div>
          {data.transactions.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Sin movimientos aún. Completa rutas para acumular saldo.
            </p>
          ) : (
            <ul className="divide-y divide-[#c8862e]/10">
              {data.transactions.map((t: any) => {
                const positive = Number(t.amount) >= 0;
                return (
                  <li
                    key={t.id}
                    className="flex items-center gap-3 px-4 py-3 text-sm"
                  >
                    <div
                      className={`grid h-8 w-8 place-items-center rounded-full ${
                        positive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {positive ? (
                        <ArrowDownLeft className="h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-[#1e3a5f]">
                        {t.description ?? txnLabel(t.type)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {timeAgo(t.created_at)}
                      </div>
                    </div>
                    <div
                      className={`font-bold ${
                        positive ? "text-emerald-700" : "text-red-700"
                      }`}
                    >
                      {positive ? "+" : ""}
                      {fmt(Number(t.amount))}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      {payoutOpen && (
        <PayoutModal
          available={data.wallet.available_balance}
          min={data.constants.min_payout}
          feeRate={data.constants.fee_rate}
          feeFixed={data.constants.fee_fixed}
          onClose={() => setPayoutOpen(false)}
          onSuccess={async () => {
            setPayoutOpen(false);
            await qc.invalidateQueries({ queryKey: ["route-wallet"] });
          }}
        />
      )}
    </div>
  );
}

function txnLabel(t: string) {
  switch (t) {
    case "ganancia_ruta":
      return "Ganancia por ruta";
    case "retiro":
      return "Retiro";
    case "reversion":
      return "Retiro revertido";
    case "ajuste_admin":
      return "Ajuste";
    default:
      return t;
  }
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    procesando: "bg-amber-100 text-amber-800",
    completado: "bg-emerald-100 text-emerald-800",
    fallido: "bg-red-100 text-red-800",
  };
  const label: Record<string, string> = {
    procesando: "Procesando",
    completado: "Completado",
    fallido: "Fallido",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${map[status] ?? "bg-slate-200 text-slate-700"}`}
    >
      {label[status] ?? status}
    </span>
  );
}

function PayoutModal({
  available,
  min,
  feeRate,
  feeFixed,
  onClose,
  onSuccess,
}: {
  available: number;
  min: number;
  feeRate: number;
  feeFixed: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState(available.toFixed(2));
  const [submitting, setSubmitting] = useState(false);
  const payoutFn = useServerFn(requestRoutePayout);

  const n = Number(amount) || 0;
  const fee = Math.ceil((n * feeRate + feeFixed) * 100) / 100;
  const net = Math.max(0, Math.round((n - fee) * 100) / 100);
  const valid = n >= min && n <= available && net > 0;

  async function submit() {
    if (!valid) return;
    setSubmitting(true);
    try {
      const res = await payoutFn({ data: { amount: n } });
      toast.success(`Retiro enviado: recibirás ${`$${res.amount_net.toFixed(2)}`}`);
      onSuccess();
    } catch (e: any) {
      toast.error(e.message ?? "Error al procesar retiro");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-serif text-xl font-bold text-[#1e3a5f]">
          Retirar ahora
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Disponible: <span className="font-bold">{fmt(available)}</span> · Mínimo{" "}
          {fmt(min)}
        </p>

        <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-[#4a3525]">
          Monto a retirar
        </label>
        <div className="mt-1 flex items-center gap-2 rounded-xl border border-[#c8862e]/40 bg-white px-3 py-2">
          <span className="text-lg font-bold text-[#4a3525]">$</span>
          <input
            type="number"
            step="0.01"
            min={min}
            max={available}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-transparent text-lg font-bold text-[#1e3a5f] outline-none"
          />
          <button
            onClick={() => setAmount(available.toFixed(2))}
            className="rounded-md bg-[#f4f1ea] px-2 py-1 text-xs font-bold text-[#1e3a5f] hover:bg-[#e6dfc9]"
          >
            Máx
          </button>
        </div>

        <div className="mt-4 space-y-1 rounded-lg bg-[#f4f1ea] p-3 text-sm">
          <Row label="Solicitas" value={fmt(n)} />
          <Row label="Comisión Stripe" value={`− ${fmt(fee)}`} />
          <div className="mt-2 flex justify-between border-t border-[#c8862e]/20 pt-2 font-bold text-[#1e3a5f]">
            <span>Recibirás</span>
            <span>{fmt(net)}</span>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-xl border border-[#c8862e]/40 px-4 py-2.5 font-bold text-[#4a3525] hover:bg-[#f4f1ea]"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={!valid || submitting}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#c8862e] px-4 py-2.5 font-bold text-white hover:bg-[#a86e1f] disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            Confirmar retiro
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-[#1e3a5f]">{value}</span>
    </div>
  );
}
