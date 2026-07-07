import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowLeft, DollarSign, RefreshCw } from "lucide-react";
import { useState } from "react";
import { adminListRoutePayouts, adminSyncRoutePayout } from "@/lib/route-wallet.functions";

export const Route = createFileRoute("/_authenticated/admin/payouts")({
  head: () => ({
    meta: [
      { title: "Retiros de repartidores — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPayoutsPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6 text-sm">No encontrado</div>,
});

function fmt(n: number) {
  return `$${Number(n).toFixed(2)}`;
}

function AdminPayoutsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-payouts"],
    queryFn: () => adminListRoutePayouts(),
  });

  if (isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error) {
    return <div className="p-6 text-sm text-destructive">{(error as Error).message}</div>;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link
        to="/repartidor"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>

      <h1 className="mb-6 font-serif text-2xl font-bold">Retiros de repartidores</h1>

      <div className="mb-6 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-amber-100 text-amber-700">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Saldo total pendiente de pago
            </div>
            <div className="font-serif text-2xl font-bold">
              {fmt(data?.totalPending ?? 0)}
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-bold">Últimos 100 retiros</h2>
        </div>
        {!data?.payouts || data.payouts.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No hay retiros registrados aún.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Fecha</th>
                  <th className="px-4 py-2">Repartidor</th>
                  <th className="px-4 py-2 text-right">Solicitado</th>
                  <th className="px-4 py-2 text-right">Comisión</th>
                  <th className="px-4 py-2 text-right">Neto</th>
                  <th className="px-4 py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.payouts.map((p: any) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {new Date(p.requested_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      {p.drivers?.full_name ?? p.driver_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-2 text-right">{fmt(p.amount_requested)}</td>
                    <td className="px-4 py-2 text-right">{fmt(p.fee)}</td>
                    <td className="px-4 py-2 text-right font-semibold">
                      {fmt(p.amount_net)}
                    </td>
                    <td className="px-4 py-2">
                      <Badge status={p.status} />
                      {p.stripe_error && (
                        <div className="mt-0.5 text-xs text-red-600">
                          {p.stripe_error}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function Badge({ status }: { status: string }) {
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
