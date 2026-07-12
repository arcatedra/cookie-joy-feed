import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, DollarSign, Loader2, TrendingUp, Trophy, Wallet } from "lucide-react";
import { getAdminFinancialBreakdown } from "@/lib/admin-financials.functions";

export const Route = createFileRoute("/_authenticated/admin/finanzas")({
  head: () => ({
    meta: [
      { title: "Finanzas del sorteo — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminFinancialsPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive">
      {error.message === "FORBIDDEN" ? "Acceso restringido a administradores." : error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-6 text-sm">No encontrado</div>,
});

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n) || 0);

function AdminFinancialsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-financials"],
    queryFn: () => getAdminFinancialBreakdown(),
  });

  if (isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-6 text-sm text-destructive">
        {(error as Error).message === "FORBIDDEN"
          ? "Acceso restringido a administradores."
          : (error as Error).message}
      </div>
    );
  }
  if (!data) return null;

  const { totals, daily, monthly } = data;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link
        to="/profile"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>

      <h1 className="mb-2 font-serif text-2xl font-bold">Finanzas del sorteo</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Desglose 50/50 de cada compra de Estrellas. Solo visible para administradores. No se
        expone en ninguna página pública.
      </p>

      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Total recaudado"
          value={fmt(totals.total_collected_usd)}
          sub={`${totals.contributions} contribuciones`}
        />
        <SummaryCard
          icon={<Trophy className="h-5 w-5" />}
          label="Al Pozo de Premios (50%)"
          value={fmt(totals.prize_pool_share_usd)}
          tone="amber"
        />
        <SummaryCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Operación plataforma (50%)"
          value={fmt(totals.platform_share_usd)}
          tone="emerald"
        />
        <SummaryCard
          icon={<Wallet className="h-5 w-5" />}
          label="Premios pagados"
          value={fmt(totals.prizes_paid_usd)}
          sub={`Pozo no reclamado: ${fmt(totals.unpaid_prize_pool_usd)}`}
        />
      </section>

      <BreakdownTable title="Por día (ET)" rows={daily} />
      <div className="h-8" />
      <BreakdownTable title="Por mes" rows={monthly} />
    </main>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: "amber" | "emerald";
}) {
  const toneClass =
    tone === "amber"
      ? "bg-amber-100 text-amber-700"
      : tone === "emerald"
        ? "bg-emerald-100 text-emerald-700"
        : "bg-muted text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-lg ${toneClass}`}>{icon}</div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-lg font-bold">{value}</div>
          {sub ? <div className="text-xs text-muted-foreground">{sub}</div> : null}
        </div>
      </div>
    </div>
  );
}

function BreakdownTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{
    bucket: string;
    contributions: number;
    total_collected_usd: number;
    prize_pool_share_usd: number;
    platform_share_usd: number;
    prizes_paid_usd: number;
  }>;
}) {
  return (
    <section>
      <h2 className="mb-3 font-serif text-lg font-semibold">{title}</h2>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Periodo</th>
                <th className="px-4 py-2 text-right">Contrib.</th>
                <th className="px-4 py-2 text-right">Recaudado</th>
                <th className="px-4 py-2 text-right">Pozo (50%)</th>
                <th className="px-4 py-2 text-right">Plataforma (50%)</th>
                <th className="px-4 py-2 text-right">Premios pagados</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                    Sin datos
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.bucket} className="border-t border-border">
                    <td className="px-4 py-2 font-mono text-xs">{r.bucket}</td>
                    <td className="px-4 py-2 text-right">{r.contributions}</td>
                    <td className="px-4 py-2 text-right">{fmt(r.total_collected_usd)}</td>
                    <td className="px-4 py-2 text-right text-amber-700">
                      {fmt(r.prize_pool_share_usd)}
                    </td>
                    <td className="px-4 py-2 text-right text-emerald-700">
                      {fmt(r.platform_share_usd)}
                    </td>
                    <td className="px-4 py-2 text-right">{fmt(r.prizes_paid_usd)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
