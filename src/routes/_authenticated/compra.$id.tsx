import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CheckCircle2, Phone, RotateCcw, ScanLine, XCircle } from "lucide-react";
import { BarcodeScanner, scanFeedback } from "@/components/BarcodeScanner";
import { Button } from "@/components/ui/button";
import {
  getPickingOrder,
  pickNotFoundItem,
  pickReplaceItem,
  pickResetItem,
  pickScanItem,
  pickWeighItem,
  pickSetQuantity,
} from "@/lib/picking.functions";
import { markOrderReadyAndCapture } from "@/lib/store-orders.functions";
import { pendingPicks, pickedQuantity } from "@/lib/barcode-rules";

export const Route = createFileRoute("/_authenticated/compra/$id")({
  head: () => ({
    meta: [
      { title: "Compra del pedido — Hazorex" },
      { name: "description", content: "Escanea y verifica cada artículo del pedido en el súper." },
      { property: "og:title", content: "Compra del pedido — Hazorex" },
      { property: "og:description", content: "Verificación por código de barras de los artículos del pedido." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PickingPage,
  errorComponent: ({ error }) => <div className="p-6 text-sm text-destructive">{(error as Error).message}</div>,
});

type Scan = { itemId: string; mode: "pick" | "replace" } | null;
const money = (n: number) => `$${n.toFixed(2)}`;

function PickingPage() {
  const { id } = Route.useParams();
  const { i18n } = useTranslation();
  const en = i18n.language?.startsWith("en");
  const L = (es: string, e: string) => (en ? e : es);
  const qc = useQueryClient();
  const fetchOrder = useServerFn(getPickingOrder);
  const scanFn = useServerFn(pickScanItem);
  const weighFn = useServerFn(pickWeighItem);
  const replaceFn = useServerFn(pickReplaceItem);
  const notFoundFn = useServerFn(pickNotFoundItem);
  const resetFn = useServerFn(pickResetItem);
  const readyFn = useServerFn(markOrderReadyAndCapture);
  const quantityFn = useServerFn(pickSetQuantity);
  const [scan, setScan] = useState<Scan>(null);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const key = ["picking", id];
  const { data: o, isLoading, error } = useQuery({ queryKey: key, queryFn: () => fetchOrder({ data: { id } }) });
  const refresh = () => qc.invalidateQueries({ queryKey: key });

  async function run(itemId: string, fn: () => Promise<unknown>) {
    setBusy(itemId);
    try {
      await fn();
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function onDetected(code: string) {
    const s = scan;
    setScan(null);
    if (!s) return;
    setBusy(s.itemId);
    try {
      if (s.mode === "pick") {
        let r = await scanFn({ data: { itemId: s.itemId, code } });
        if (r.result === "needs_confirm") {
          const okSave = window.confirm(
            L(
              `Este producto todavía no tiene código guardado.\n¿Confirmas que el producto escaneado (${code}) es exactamente el que pidió el cliente? Se guardará para la próxima vez.`,
              `This product has no saved barcode yet.\nDo you confirm the scanned product (${code}) is exactly what the customer ordered? It will be saved for next time.`,
            ),
          );
          if (!okSave) return;
          r = await scanFn({ data: { itemId: s.itemId, code, saveAsProductCode: true } });
        }
        if (r.result === "found") {
          scanFeedback(true);
          setWrongId(null);
          toast.success(L("Encontrado", "Found"));
        } else if (r.result === "wrong") {
          scanFeedback(false);
          setWrongId(s.itemId);
        }
      } else {
        const r = await replaceFn({ data: { itemId: s.itemId, code } });
        if (r.ok) {
          scanFeedback(true);
          toast.success(L(`Reemplazado por ${r.name}`, `Replaced with ${r.name}`));
        } else {
          scanFeedback(false);
          toast.error(L("Ese código no está en el catálogo.", "That barcode is not in the catalog."));
        }
      }
      await refresh();
    } catch (e) {
      scanFeedback(false);
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function markReady() {
    if (!o) return;
    setBusy("ready");
    try {
      const r: any = await readyFn({ data: { id: o.id, items: [] } });
      toast.success(r?.cobrado != null ? L(`Listo. Cobrado ${money(r.cobrado)}`, `Ready. Charged ${money(r.cobrado)}`) : L("Listo", "Ready"));
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">{L("Cargando…", "Loading…")}</p>;
  if (error || !o) return <p className="p-6 text-sm text-destructive">{(error as Error)?.message ?? L("Pedido no encontrado", "Order not found")}</p>;

  const pending = pendingPicks(o.items);
  const estimate = o.items.reduce(
    (s, it) => s + it.precio_unitario * pickedQuantity(it, { vendido_por_lb: it.porLibra, peso_lb: it.pesoLb }),
    0,
  );
  const prefLabel: Record<string, string> = {
    similar: L("Reemplazar con algo similar", "Replace with something similar"),
    no_reemplazar: L("No reemplazar", "Don't replace"),
    llamar: L("Llamarme", "Call me"),
  };

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4 pb-32">
      <header>
        <h1 className="text-2xl font-bold">{L("Compra del pedido", "Order shopping")} #{o.numero}</h1>
        <p className="text-sm text-muted-foreground">
          {L("Si un artículo falta:", "If an item is missing:")} <b>{prefLabel[o.reemplazo] ?? o.reemplazo}</b>
        </p>
        {o.telefonoCliente && (
          <a href={`tel:${o.telefonoCliente}`} className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-primary underline">
            <Phone className="h-4 w-4" /> {L("Llamar al cliente", "Call customer")}
          </a>
        )}
        {o.notas && <p className="mt-1 text-xs text-muted-foreground">{o.notas}</p>}
        {!o.editable && (
          <p className="mt-2 rounded-lg bg-muted p-2 text-sm">{L("Este pedido ya está listo o cerrado.", "This order is already ready or closed.")}</p>
        )}
      </header>

      <ul className="space-y-3">
        {o.items.map((it) => {
          const name = en && it.nombre_en ? it.nombre_en : it.nombre;
          const done = it.pick_status !== "pendiente";
          const wrong = wrongId === it.id && !done;
          const tone =
            it.pick_status === "encontrado" || it.pick_status === "reemplazado"
              ? "border-primary bg-primary/10"
              : it.pick_status === "no_habia"
                ? "border-muted-foreground/40 bg-muted"
                : wrong
                  ? "border-destructive bg-destructive/10"
                  : "border-border bg-card";
          return (
            <li key={it.id} className={`rounded-xl border-2 p-3 ${tone}`}>
              <div className="flex gap-3">
                {it.imagen ? (
                  <img src={it.imagen} alt="" className="h-16 w-16 shrink-0 rounded-lg bg-background object-contain" />
                ) : (
                  <div className="h-16 w-16 shrink-0 rounded-lg bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-tight">{name}</p>
                  <p className="text-xs text-muted-foreground">
                    {it.tamano ? `${it.tamano} · ` : ""}
                    {it.porLibra
                      ? L(`${it.cantidad} × aprox. ${it.pesoLb} lb`, `${it.cantidad} × approx. ${it.pesoLb} lb`)
                      : L(`Cantidad: ${it.cantidad}`, `Quantity: ${it.cantidad}`)}
                  </p>
                  <StatusLine it={it} L={L} />
                </div>
              </div>

              {wrong && (
                <p className="mt-2 flex items-center gap-2 rounded-lg bg-destructive px-3 py-2 text-sm font-bold text-destructive-foreground">
                  <XCircle className="h-5 w-5 shrink-0" />
                  {L("Producto incorrecto, este no es el que pidió el cliente", "Wrong product, this is not what the customer ordered")}
                </p>
              )}

              {o.editable && !done && (
                <div className="mt-3 space-y-2">
                  {it.porLibra ? (
                    <div className="flex gap-2">
                      <input
                        value={weights[it.id] ?? ""}
                        onChange={(e) => setWeights((w) => ({ ...w, [it.id]: e.target.value }))}
                        inputMode="decimal"
                        placeholder={L("Peso real (lb)", "Actual weight (lb)")}
                        aria-label={L("Peso real en libras", "Actual weight in pounds")}
                        className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2"
                      />
                      <button
                        type="button"
                        disabled={busy === it.id}
                        onClick={() => {
                          const w = Number(String(weights[it.id] ?? "").replace(",", "."));
                          if (!(w > 0)) return toast.error(L("Escribe el peso en lb.", "Enter the weight in lb."));
                          run(it.id, () => weighFn({ data: { itemId: it.id, weightLb: w } }));
                        }}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
                      >
                        {L("Encontrado", "Found")}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={busy === it.id}
                      onClick={() => setScan({ itemId: it.id, mode: "pick" })}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
                    >
                      <ScanLine className="h-5 w-5" /> {L("Escanear", "Scan")}
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {o.reemplazo !== "no_reemplazar" ? (
                      <button
                        type="button"
                        disabled={busy === it.id}
                        onClick={() => setScan({ itemId: it.id, mode: "replace" })}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold"
                      >
                        {L("Reemplazar", "Replace")}
                      </button>
                    ) : (
                      <span className="rounded-lg px-3 py-2 text-center text-xs text-muted-foreground">
                        {L("El cliente no quiere reemplazos", "Customer doesn't want replacements")}
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={busy === it.id}
                      onClick={() => {
                        if (window.confirm(L("¿Marcar como No había? No se le cobrará al cliente y se le avisará.", "Mark as Out of stock? The customer won't be charged and will be notified.")))
                          run(it.id, () => notFoundFn({ data: { itemId: it.id } }));
                      }}
                      className="rounded-lg border border-destructive px-3 py-2 text-sm font-semibold text-destructive"
                    >
                      {L("No había", "Out of stock")}
                    </button>
                  </div>
                </div>
              )}

              {o.editable && done && (
                <div className="mt-3 space-y-2">
                {!it.porLibra && it.pick_status !== "no_habia" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <label htmlFor={`quantity-${it.id}`} className="text-sm">{L("Cantidad real", "Actual quantity")}</label>
                    <input id={`quantity-${it.id}`} type="number" min={0} max={it.cantidad} step="1"
                      value={quantities[it.id] ?? String(it.cantidad_real ?? it.cantidad)}
                      onChange={(e) => setQuantities((prev) => ({ ...prev, [it.id]: e.target.value }))}
                      className="w-20 rounded border border-border bg-background px-2 py-1" />
                    <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => run(it.id, async () => {
                      const raw = quantities[it.id] ?? String(it.cantidad_real ?? it.cantidad);
                      if (!raw.trim()) throw new Error(L("Escribe la cantidad real.", "Enter the actual quantity."));
                      await quantityFn({ data: { itemId: it.id, quantity: Number(raw) } });
                      setQuantities((prev) => { const next = { ...prev }; delete next[it.id]; return next; });
                    })}>{L("Guardar", "Save")}</Button>
                  </div>
                )}
                <button
                  type="button"
                  disabled={busy === it.id}
                  onClick={() => run(it.id, async () => {
                    await resetFn({ data: { itemId: it.id } });
                    setQuantities((prev) => { const next = { ...prev }; delete next[it.id]; return next; });
                  })}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground underline"
                >
                  <RotateCcw className="h-3 w-3" /> {L("Deshacer", "Undo")}
                </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background p-3 pb-[max(env(safe-area-inset-bottom),12px)]">
        <div className="mx-auto max-w-2xl space-y-2">
          <div className="flex justify-between text-sm">
            <span>{pending > 0 ? L(`Faltan ${pending} por revisar`, `${pending} left to check`) : L("Todo revisado", "All checked")}</span>
            <span className="font-semibold">{L("Productos", "Products")}: {money(estimate)}</span>
          </div>
          {o.editable && o.canCapture ? (
            <button
              type="button"
              disabled={pending > 0 || busy !== null || Object.keys(quantities).length > 0}
              onClick={markReady}
              className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {busy === "ready" ? L("Cobrando…", "Charging…") : L("Listo para entregar", "Ready for delivery")}
            </button>
          ) : o.editable ? (
            <p className="text-center text-xs text-muted-foreground">
              {L("Cuando todo esté revisado, la tienda marcará el pedido como listo.", "When everything is checked, the store will mark the order ready.")}
            </p>
          ) : (
            <Link to="/profile" className="block text-center text-sm underline">{L("Volver", "Back")}</Link>
          )}
        </div>
      </div>

      {scan && (
        <BarcodeScanner
          title={scan.mode === "replace" ? L("Escanear reemplazo", "Scan replacement") : L("Escanear artículo", "Scan item")}
          onDetected={onDetected}
          onClose={() => setScan(null)}
        />
      )}
    </main>
  );
}

function StatusLine({ it, L }: { it: any; L: (es: string, en: string) => string }) {
  if (it.pick_status === "encontrado")
    return (
      <p className="mt-1 flex items-center gap-1 text-sm font-bold text-primary">
        <CheckCircle2 className="h-4 w-4" /> {L("Encontrado", "Found")}
        {it.picked_weight_lb ? ` · ${it.picked_weight_lb} lb` : ""}
        {!it.porLibra ? ` · ${it.cantidad_real ?? it.cantidad}/${it.cantidad}` : ""}
      </p>
    );
  if (it.pick_status === "reemplazado")
    return <p className="mt-1 text-sm font-bold text-primary">{L("Reemplazado", "Replaced")}: {it.replacement_name}</p>;
  if (it.pick_status === "no_habia")
    return <p className="mt-1 text-sm font-bold text-muted-foreground">{L("No había · no se cobra", "Out of stock · not charged")}</p>;
  return <p className="mt-1 text-xs text-muted-foreground">{L("Pendiente", "Pending")}</p>;
}
