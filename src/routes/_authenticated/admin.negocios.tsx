import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Check, X, Ban } from "lucide-react";
import {
  listAllBusinesses,
  approveBusiness,
  rejectBusiness,
  suspendBusiness,
} from "@/lib/admin-businesses.functions";
import {
  BUSINESS_TYPE_LABELS,
  BUSINESS_STATUS_LABELS,
  type Business,
  type BusinessStatus,
} from "@/lib/businesses";

export const Route = createFileRoute("/_authenticated/admin/negocios")({
  head: () => ({
    meta: [
      { title: "Admin — Negocios Hazorex" },
      { name: "description", content: "Aprobación y gestión de negocios registrados." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminBusinessesPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive">{error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6 text-sm">No encontrado</div>,
});

const STATUS_COLOR: Record<BusinessStatus, string> = {
  pendiente: "bg-amber-100 text-amber-800",
  aprobado: "bg-emerald-100 text-emerald-800",
  rechazado: "bg-red-100 text-red-800",
  suspendido: "bg-slate-200 text-slate-800",
};

function AdminBusinessesPage() {
  const qc = useQueryClient();
  const fetchAll = useServerFn(listAllBusinesses);
  const approve = useServerFn(approveBusiness);
  const reject = useServerFn(rejectBusiness);
  const suspend = useServerFn(suspendBusiness);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "businesses"],
    queryFn: () => fetchAll(),
  });

  const [filter, setFilter] = useState<BusinessStatus | "todos">("pendiente");
  const [busy, setBusy] = useState<string | null>(null);

  async function onApprove(id: string) {
    setBusy(id);
    try {
      await approve({ data: { id } });
      toast.success("Aprobado");
      qc.invalidateQueries({ queryKey: ["admin", "businesses"] });
    } catch (err: any) {
      toast.error(err.message ?? "Error");
    } finally {
      setBusy(null);
    }
  }

  async function onReject(id: string) {
    const reason = prompt("Motivo del rechazo:");
    if (!reason || reason.trim().length < 3) return;
    setBusy(id);
    try {
      await reject({ data: { id, reason: reason.trim() } });
      toast.success("Rechazado");
      qc.invalidateQueries({ queryKey: ["admin", "businesses"] });
    } catch (err: any) {
      toast.error(err.message ?? "Error");
    } finally {
      setBusy(null);
    }
  }

  async function onSuspend(id: string) {
    const reason = prompt("Motivo de la suspensión (opcional):") ?? "";
    setBusy(id);
    try {
      await suspend({ data: { id, reason: reason.trim() || undefined } });
      toast.success("Suspendido");
      qc.invalidateQueries({ queryKey: ["admin", "businesses"] });
    } catch (err: any) {
      toast.error(err.message ?? "Error");
    } finally {
      setBusy(null);
    }
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-sm text-destructive">{(error as Error).message}</div>;
  }

  const list = (data ?? []) as Business[];
  const filtered = filter === "todos" ? list : list.filter((b) => b.status === filter);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link
        to="/profile"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>

      <h1 className="mb-4 font-serif text-2xl font-bold">Negocios registrados</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["pendiente", "aprobado", "rechazado", "suspendido", "todos"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              filter === f
                ? "bg-amber-600 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {f === "todos" ? "Todos" : BUSINESS_STATUS_LABELS[f]} (
            {f === "todos" ? list.length : list.filter((b) => b.status === f).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Sin registros.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((b) => (
            <li
              key={b.id}
              className="rounded-md border border-border bg-card p-4 shadow-sm"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{b.business_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {BUSINESS_TYPE_LABELS[b.business_type]}
                    {b.city ? ` · ${b.city}` : ""} · {b.email} · {b.phone}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{b.address}</div>
                  {b.rejection_reason && (
                    <div className="mt-1 text-xs text-red-700">Motivo: {b.rejection_reason}</div>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[b.status]}`}
                >
                  {BUSINESS_STATUS_LABELS[b.status]}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {b.status !== "aprobado" && (
                  <button
                    onClick={() => onApprove(b.id)}
                    disabled={busy === b.id}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" /> Aprobar
                  </button>
                )}
                {b.status !== "rechazado" && (
                  <button
                    onClick={() => onReject(b.id)}
                    disabled={busy === b.id}
                    className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" /> Rechazar
                  </button>
                )}
                {b.status === "aprobado" && (
                  <button
                    onClick={() => onSuspend(b.id)}
                    disabled={busy === b.id}
                    className="inline-flex items-center gap-1 rounded-md bg-slate-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                  >
                    <Ban className="h-3.5 w-3.5" /> Suspender
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
