import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Printer, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format-price";
import { adminCookieOrderAction, adminListCookieOrders } from "@/lib/admin-cookie-orders.functions";
import {
  allowedActions, COOKIE_STATUS_FILTERS, COOKIE_STATUS_LABEL, isUnpaid, nyToday, statusGroup,
  type CookieAdminAction,
} from "@/lib/admin-cookie-order-rules";

export const Route = createFileRoute("/_authenticated/admin/pedidos-galletas")({
  head: () => ({
    meta: [
      { title: "Pedidos de galletas — Admin Hazorex" },
      { name: "description", content: "Prepara, entrega, cancela o reembolsa pedidos de Hazorex Galletas." },
      { property: "og:title", content: "Pedidos de galletas — Admin Hazorex" },
      { property: "og:description", content: "Prepara, entrega, cancela o reembolsa pedidos de Hazorex Galletas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminCookieOrders,
  errorComponent: ({ error }) => <div className="p-6 text-sm text-destructive">{(error as Error).message}</div>,
  notFoundComponent: () => <div className="p-6 text-sm">No encontrado</div>,
});

const ACTION_LABEL: Record<CookieAdminAction, string> = {
  preparando: "Marcar en preparación",
  listo: "Marcar listo",
  entregado: "Marcar entregado",
  cancelar: "Cancelar",
  reembolsar: "Reembolsar",
};

const dayLabel = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });

function addressText(d: any) {
  if (!d || typeof d !== "object") return "—";
  return [d.line1 ?? d.direccion_linea1 ?? d.address, d.line2 ?? d.direccion_linea2 ?? d.apt, d.city ?? d.ciudad, d.state ?? d.estado, d.postal_code ?? d.zip ?? d.codigo_postal]
    .filter(Boolean).join(", ") || "—";
}

function AdminCookieOrders() {
  const fetchList = useServerFn(adminListCookieOrders);
  const act = useServerFn(adminCookieOrderAction);
  const [busy, setBusy] = useState<string | null>(null);
  const [estado, setEstado] = useState("");
  const [dia, setDia] = useState("");
  const [showPrep, setShowPrep] = useState(false);
  const { data, isLoading, refetch } = useQuery({ queryKey: ["admin-cookie-orders"], queryFn: () => fetchList() });
  const pedidos = data?.pedidos ?? [];
  const today = nyToday();

  const dias = useMemo(() => [...new Set(pedidos.map((p) => p.entrega))].sort().reverse(), [pedidos]);
  const filtered = pedidos.filter((p) => (!estado || statusGroup(p.estado) === estado) && (!dia || p.entrega === dia));
  const todays = pedidos.filter((p) => nyToday(new Date(p.creadoEn)) === today);
  const porPreparar = pedidos.filter((p) => ["pagado", "autorizado", "preparando"].includes(p.estado)).length;
  const cobradoHoy = pedidos
    .filter((p) => p.capturadoEn && nyToday(new Date(p.capturadoEn)) === today && p.estado !== "reembolsado")
    .reduce((s, p) => s + Number(p.monto_capturado ?? 0), 0);

  const prepDay = dia || dias.find((d) => d >= today) || dias[0] || "";
  const prepList = useMemo(() => {
    const m = new Map<string, number>();
    pedidos
      .filter((p) => p.entrega === prepDay && !isUnpaid(p.estado) && !["cancelado", "reembolsado"].includes(p.estado))
      .forEach((p) => p.items.forEach((i) => m.set(i.nombre, (m.get(i.nombre) ?? 0) + i.cantidad)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [pedidos, prepDay]);

  async function run(id: string, action: CookieAdminAction, numero: string) {
    if (action === "reembolsar" && !window.confirm(`¿Reembolsar el total del pedido #${numero}? No se puede deshacer.`)) return;
    if (action === "cancelar" && !window.confirm(`¿Cancelar el pedido #${numero}?`)) return;
    setBusy(id);
    try {
      const r = await act({ data: { id, action } });
      toast.success(`Pedido #${numero}: ${r.label}`);
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo hacer el cambio");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <header className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Pedidos de galletas</h1>
          <p className="text-sm text-muted-foreground">Prepara, entrega, cancela o reembolsa cada pedido.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
        </Button>
      </header>

      <div className="grid grid-cols-3 gap-2 print:hidden">
        {[["Pedidos de hoy", String(todays.length)], ["Por preparar", String(porPreparar)], ["Cobrado hoy", formatPrice(cobradoHoy)]].map(([l, v]) => (
          <div key={l} className="rounded-2xl border p-3 text-center">
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="text-xl font-bold">{v}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <select className="rounded-lg border bg-background px-2 py-1 text-sm" value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          {COOKIE_STATUS_FILTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className="rounded-lg border bg-background px-2 py-1 text-sm" value={dia} onChange={(e) => setDia(e.target.value)} aria-label="Filtrar por día de entrega">
          <option value="">Todos los días de entrega</option>
          {dias.map((d) => <option key={d} value={d}>{dayLabel(d)}</option>)}
        </select>
        <Button variant="outline" size="sm" onClick={() => setShowPrep((v) => !v)}>
          {showPrep ? "Ocultar lista para hornear" : "Lista para hornear"}
        </Button>
      </div>

      {showPrep && (
        <section className="rounded-2xl border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Lista para hornear · entrega {prepDay ? dayLabel(prepDay) : "—"}</h2>
            <Button size="sm" variant="ghost" className="print:hidden" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Imprimir
            </Button>
          </div>
          {prepList.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No hay galletas pagadas para ese día.</p>
          ) : (
            <ul className="mt-2 divide-y text-sm">
              {prepList.map(([n, q]) => (
                <li key={n} className="flex justify-between py-1"><span>{n}</span><span className="font-bold">{q}</span></li>
              ))}
              <li className="flex justify-between py-1 font-bold"><span>Total</span><span>{prepList.reduce((s, [, q]) => s + q, 0)}</span></li>
            </ul>
          )}
        </section>
      )}

      <div className={showPrep ? "print:hidden" : ""}>
        {isLoading ? (
          <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No hay pedidos con esos filtros.</p>
        ) : (
          <ul className="divide-y rounded-2xl border">
            {filtered.map((p) => (
              <li key={p.id} className="space-y-2 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">#{p.numero} · {COOKIE_STATUS_LABEL[p.estado] ?? p.estado}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.creadoEn).toLocaleString("es", { timeZone: "America/New_York" })} · entrega {dayLabel(p.entrega)}
                    </p>
                  </div>
                  <p className="text-sm font-bold">{formatPrice(p.total)}</p>
                </div>
                <div className="text-xs">
                  <p>{p.cliente.nombre}{p.cliente.telefono ? ` · ${p.cliente.telefono}` : ""}{p.cliente.email ? ` · ${p.cliente.email}` : ""}</p>
                  <p className="text-muted-foreground">{addressText(p.direccion)}</p>
                </div>
                <p className="text-xs">{p.items.map((i) => `${i.cantidad} × ${i.nombre}`).join(" · ") || "—"}</p>
                <p className="text-xs text-muted-foreground">
                  Subtotal {formatPrice(p.subtotal)} · Entrega {formatPrice(p.envio)} · Propina {formatPrice(p.propina)} · Total {formatPrice(p.total)}
                </p>
                {allowedActions(p).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {allowedActions(p).map((a) => (
                      <Button key={a} size="sm" disabled={busy === p.id}
                        variant={a === "reembolsar" || a === "cancelar" ? "destructive" : "default"}
                        onClick={() => run(p.id, a, p.numero)}>
                        {ACTION_LABEL[a]}
                      </Button>
                    ))}
                  </div>
                )}
                {p.historial.length > 0 && (
                  <ul className="space-y-0.5 text-[11px] text-muted-foreground">
                    {p.historial.map((h, i) => (
                      <li key={i}>
                        {new Date(h.en).toLocaleString("es", { timeZone: "America/New_York" })} · {h.por}: {COOKIE_STATUS_LABEL[h.de ?? ""] ?? h.de} → {COOKIE_STATUS_LABEL[h.a] ?? h.a}{h.nota ? ` (${h.nota})` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
