import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, Eye, EyeOff, Plus, ScanLine, Search, Upload } from "lucide-react";
import { BarcodeScanner, scanFeedback } from "@/components/BarcodeScanner";
import { parseBarcodeList } from "@/lib/barcode-rules";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  adminAssignBarcode,
  adminBulkHouseProducts,
  adminFindProductByBarcode,
  adminListHouseProducts,
  adminQuickUpdateHouseProduct,
  adminSaveHouseProduct,
  adminUploadHouseImage,
} from "@/lib/house-store.functions";
import { HOUSE_CATEGORIES, houseSubcategories, TEMPLATE_HEADERS, parseBulkRows, type HouseProductInput } from "@/lib/house-store-rules";

export const Route = createFileRoute("/_authenticated/admin/productos")({
  head: () => ({
    meta: [
      { title: "Productos del supermercado — Admin Hazorex" },
      { name: "description", content: "Agrega y edita los productos del supermercado de Hazorex." },
      { property: "og:title", content: "Productos del supermercado — Admin Hazorex" },
      { property: "og:description", content: "Administración del catálogo del supermercado Hazorex." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminProductsPage,
  errorComponent: ({ error }) => <div className="p-6 text-sm text-destructive">{(error as Error).message}</div>,
});

const EMPTY: HouseProductInput = {
  nombre: "", nombre_en: "", categoria: "Frutas y verduras", precio: 0, precio_anterior: null, tamano: "",
  peso_lb: 0, vendido_por_lb: false, disponible: true, stock: null, super: "", direccion: "", imagen_url: null,
};

function AdminProductsPage() {
  const list = useServerFn(adminListHouseProducts);
  const quick = useServerFn(adminQuickUpdateHouseProduct);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-house-products"], queryFn: () => list() });
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [editing, setEditing] = useState<HouseProductInput | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [scanMode, setScanMode] = useState<"find" | "teach" | null>(null);
  const [teachCode, setTeachCode] = useState<string | null>(null);
  const findFn = useServerFn(adminFindProductByBarcode);

  function toEditing(p: any): HouseProductInput {
    return {
      id: p.id, nombre: p.nombre, nombre_en: p.nombre_en ?? "", categoria: p.categoria || "Despensa",
      precio: Number(p.precio), precio_anterior: p.precio_anterior == null ? null : Number(p.precio_anterior),
      tamano: p.tamano ?? "", peso_lb: Number(p.peso_lb ?? 0), vendido_por_lb: !!p.vendido_por_lb,
      disponible: p.disponible !== false, stock: p.stock ?? null, super: p.super, direccion: p.direccion, imagen_url: null,
      codigo_barras: p.codigo_barras ?? null, codigos_barras: p.codigos_barras ?? [],
      descripcion: p.descripcion ?? "", descripcion_en: p.descripcion_en ?? "", subcategoria: p.subcategoria ?? null,
    };
  }

  async function onScanned(code: string) {
    const mode = scanMode;
    setScanMode(null);
    if (mode === "teach") return setTeachCode(code);
    try {
      const r = await findFn({ data: { code } });
      const p = r.product && ((data?.products ?? []) as any[]).find((x) => x.id === r.product!.id);
      if (!p) { scanFeedback(false); return toast.error(`El código ${code} no pertenece a ningún producto.`); }
      scanFeedback(true);
      setEditing(toEditing(p));
    } catch (e) { toast.error((e as Error).message); }
  }

  const products = useMemo(() => {
    const t = q.trim().toLowerCase();
    return ((data?.products ?? []) as any[]).filter(
      (p) => (!cat || p.categoria === cat) && (!t || `${p.nombre} ${p.nombre_en ?? ""}`.toLowerCase().includes(t)),
    );
  }, [data, q, cat]);

  async function patch(id: string, body: Record<string, unknown>) {
    try {
      await quick({ data: { id, ...body } as any });
      await qc.invalidateQueries({ queryKey: ["admin-house-products"] });
      toast.success("Guardado");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <main className="mx-auto max-w-6xl p-4 pb-24">
      <h1 className="text-2xl font-bold">Productos del supermercado</h1>
      <p className="text-sm text-muted-foreground">Tienda Hazorex Supermercado. "Dónde comprarlo" solo lo ven tú y el repartidor del pedido.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <label className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar" className="w-full bg-transparent text-sm outline-none" />
        </label>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <option value="">Todas las categorías</option>
          {HOUSE_CATEGORIES.map((c) => <option key={c.es}>{c.es}</option>)}
        </select>
        <Button onClick={() => setEditing({ ...EMPTY })}><Plus className="mr-1 h-4 w-4" /> Agregar producto</Button>
        <Button variant="outline" onClick={() => setBulkOpen(true)}><Upload className="mr-1 h-4 w-4" /> Subir en bloque</Button>
        <Button variant="outline" onClick={() => setScanMode("teach")}><ScanLine className="mr-1 h-4 w-4" /> Escanear para guardar código</Button>
        <Button variant="outline" onClick={() => setScanMode("find")}><Search className="mr-1 h-4 w-4" /> Buscar escaneando</Button>
      </div>

      {isLoading && <p className="mt-6 text-sm text-muted-foreground">Cargando…</p>}
      {error && <p className="mt-6 text-sm text-destructive">{(error as Error).message}</p>}

      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-2">Producto</th><th className="p-2">Categoría</th><th className="p-2">Precio</th>
              <th className="p-2">Oferta (antes)</th><th className="p-2">Stock</th><th className="p-2">Peso</th>
              <th className="p-2">Dónde comprar</th><th className="p-2">Visible</th><th className="p-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((p) => (
              <tr key={p.id} className={p.disponible === false ? "opacity-50" : ""}>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    {p.imagenUrl ? <img src={p.imagenUrl} alt="" className="h-10 w-10 rounded object-cover" /> : <div className="h-10 w-10 rounded bg-muted" />}
                    <div>
                      <p className="font-medium">{p.nombre}</p>
                      <p className="text-xs text-muted-foreground">{p.tamano}{p.vendido_por_lb ? " · por libra" : ""}</p>
                      {(p.codigos_barras ?? []).length > 0 && <p className="text-xs text-muted-foreground">Códigos: {(p.codigos_barras as string[]).join(", ")}</p>}
                      {p.foto_credito && <p className="text-xs text-muted-foreground">{p.foto_credito} ({p.foto_licencia})</p>}
                    </div>
                  </div>
                </td>
                 <td className="p-2">{p.categoria}{p.subcategoria && <p className="text-xs text-muted-foreground">{p.subcategoria}</p>}</td>
                <td className="p-2"><QuickNum value={p.precio} onSave={(v) => v && patch(p.id, { precio: v })} /></td>
                <td className="p-2"><QuickNum value={p.precio_anterior} onSave={(v) => patch(p.id, { precio_anterior: v })} /></td>
                <td className="p-2"><QuickNum value={p.stock} int onSave={(v) => patch(p.id, { stock: v })} /></td>
                <td className="p-2">{Number(p.peso_lb)} lb</td>
                <td className="p-2 text-xs">{p.super}{p.direccion ? ` · ${p.direccion}` : ""}</td>
                <td className="p-2">
                  <button onClick={() => patch(p.id, { disponible: p.disponible === false })} aria-label="Ocultar o mostrar">
                    {p.disponible === false ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-primary" />}
                  </button>
                </td>
                <td className="p-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(toEditing(p))}>Editar</Button>
                </td>
              </tr>
            ))}
            {!isLoading && products.length === 0 && (
              <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">Sin productos</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && <ProductDialog initial={editing} onClose={() => setEditing(null)} />}
      {bulkOpen && <BulkDialog onClose={() => setBulkOpen(false)} />}
      {scanMode && <BarcodeScanner title={scanMode === "teach" ? "Escanear para guardar código" : "Buscar producto escaneando"} onDetected={onScanned} onClose={() => setScanMode(null)} />}
      {teachCode && <TeachDialog code={teachCode} products={(data?.products ?? []) as any[]} onClose={() => setTeachCode(null)} />}
    </main>
  );
}

function QuickNum({ value, onSave, int }: { value: any; onSave: (v: number | null) => void; int?: boolean }) {
  const [v, setV] = useState(value == null ? "" : String(value));
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        const orig = value == null ? "" : String(value);
        if (v === orig) return;
        const n = v.trim() === "" ? null : int ? parseInt(v, 10) : Number(v);
        if (n !== null && !Number.isFinite(n)) return setV(orig);
        onSave(n);
      }}
      inputMode="decimal"
      className="w-20 rounded border border-border bg-background px-2 py-1"
    />
  );
}

function ProductDialog({ initial, onClose }: { initial: HouseProductInput; onClose: () => void }) {
  const save = useServerFn(adminSaveHouseProduct);
  const upload = useServerFn(adminUploadHouseImage);
  const qc = useQueryClient();
  const [f, setF] = useState<any>({ ...initial, precio: initial.precio || "", peso_lb: initial.peso_lb || "", codigos_txt: (initial.codigos_barras ?? (initial.codigo_barras ? [initial.codigo_barras] : [])).join("; ") });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: unknown) => setF((p: any) => ({ ...p, [k]: v }));

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 3_000_000) return toast.error("La foto debe pesar menos de 3 MB.");
    const dataUrl = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(file); });
    try {
      const { path } = await upload({ data: { dataUrl } });
      set("imagen_url", path);
      toast.success("Foto lista");
    } catch (e) { toast.error((e as Error).message); }
  }

  async function submit() {
    if (!(Number(f.peso_lb) > 0)) return toast.error("El peso en lb es obligatorio.");
    const bc = parseBarcodeList(f.codigos_txt);
    if (bc.invalid.length) return toast.error(`Código de barras inválido: ${bc.invalid.join(", ")} (solo números, 8 a 14).`);
    setBusy(true);
    try {
      await save({ data: {
        ...f, precio: Number(f.precio), peso_lb: Number(f.peso_lb),
        precio_anterior: f.precio_anterior === "" || f.precio_anterior == null ? null : Number(f.precio_anterior),
        stock: f.stock === "" || f.stock == null ? null : Number(f.stock),
        codigos_txt: undefined,
        codigos_barras: bc.codes,
        codigo_barras: bc.codes[0] ?? null,
      } });
      await qc.invalidateQueries({ queryKey: ["admin-house-products"] });
      toast.success("Producto guardado");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  }

  const input = (k: string, label: string, props: any = {}) => (
    <label className="block text-sm">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      <input value={f[k] ?? ""} onChange={(e) => set(k, e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2" {...props} />
    </label>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial.id ? "Editar producto" : "Agregar producto"}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {input("nombre", "Nombre (español)")}
          {input("nombre_en", "Nombre (inglés)")}
          {input("descripcion", "Descripción corta (español)", { maxLength: 240 })}
          {input("descripcion_en", "Descripción corta (inglés)", { maxLength: 240 })}
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">Categoría</span>
            <select value={f.categoria} onChange={(e) => setF((p: any) => ({ ...p, categoria: e.target.value, subcategoria: null }))} className="w-full rounded-lg border border-border bg-background px-3 py-2">
              {HOUSE_CATEGORIES.map((c) => <option key={c.es}>{c.es}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">Foto</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => onFile(e.target.files?.[0])} className="w-full text-xs" />
          </label>
          {houseSubcategories(f.categoria).length > 0 && <label className="block text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">Subcategoría</span>
            <select value={f.subcategoria ?? ""} onChange={(e) => set("subcategoria", e.target.value || null)} className="w-full rounded-lg border border-border bg-background px-3 py-2">
              <option value="">Sin subcategoría</option>
              {houseSubcategories(f.categoria).map((c) => <option key={c.es}>{c.es}</option>)}
            </select>
          </label>}
          {input("precio", f.vendido_por_lb ? "Precio por libra ($)" : "Precio ($)", { inputMode: "decimal" })}
          {input("precio_anterior", "Precio anterior / oferta ($, opcional)", { inputMode: "decimal" })}
          {input("tamano", "Tamaño (ej. 16 oz)")}
          {input("codigos_txt", "Códigos de barras UPC/EAN (varios separados por ;)", { inputMode: "numeric" })}
          {input("peso_lb", f.vendido_por_lb ? "Peso aproximado por porción (lb) *" : "Peso (lb) *", { inputMode: "decimal" })}
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">Se vende</span>
            <select value={f.vendido_por_lb ? "lb" : "u"} onChange={(e) => set("vendido_por_lb", e.target.value === "lb")} className="w-full rounded-lg border border-border bg-background px-3 py-2">
              <option value="u">Por unidad</option><option value="lb">Por libra</option>
            </select>
          </label>
          {input("stock", "Stock (opcional)", { inputMode: "numeric" })}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.disponible} onChange={(e) => set("disponible", e.target.checked)} /> Disponible
          </label>
          <div />
          {input("super", "Dónde comprarlo: súper")}
          {input("direccion", "Dónde comprarlo: dirección")}
        </div>
        <Button onClick={submit} disabled={busy} className="mt-2 w-full">{busy ? "Guardando…" : "Guardar"}</Button>
      </DialogContent>
    </Dialog>
  );
}

function BulkDialog({ onClose }: { onClose: () => void }) {
  const bulk = useServerFn(adminBulkHouseProducts);
  const qc = useQueryClient();
  const [parsed, setParsed] = useState<ReturnType<typeof parseBulkRows> | null>(null);
  const [busy, setBusy] = useState(false);

  async function template() {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([
      [...TEMPLATE_HEADERS],
      ["Aguacate Hass grande", "Large Hass avocado", "Frutas y verduras", 3.14, "", "1 unidad", 0.5, "no", "si", "", "Food Bazaar", "", "", "", "Frutas", ""],
      ["Goya Frijoles negros 15.5 oz", "Goya Black beans 15.5 oz", "Despensa", 1.79, "", "15.5 oz", 1, "no", "si", "", "Food Bazaar", "", "", "", "Enlatados", "012345678905; 0012345678905"],
      ["Guineos / plátanos", "Bananas", "Frutas y verduras", 2.40, "", "aprox. 2 lb", 2, "si", "si", "", "Food Bazaar", "", "", "", "Frutas", ""],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos");
    XLSX.writeFile(wb, "plantilla-productos-hazorex.xlsx");
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await file.arrayBuffer());
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: "" });
    setParsed(parseBulkRows(rows));
  }

  async function submit() {
    if (!parsed?.ok.length) return;
    setBusy(true);
    try {
      const r = await bulk({ data: { items: parsed.ok } });
      await qc.invalidateQueries({ queryKey: ["admin-house-products"] });
      toast.success(`${r.saved} productos agregados`);
      onClose();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Subir productos en bloque</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Usa la plantilla (CSV o Excel). Columnas: {TEMPLATE_HEADERS.join(", ")}. "por_libra" y "disponible": si / no. "codigos_barras": solo números, varios separados por ;.</p>
        <Button variant="outline" onClick={template}><Download className="mr-1 h-4 w-4" /> Descargar plantilla</Button>
        <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => onFile(e.target.files?.[0])} className="text-sm" />
        {parsed && (
          <div className="space-y-1 text-sm">
            <p>{parsed.ok.length} filas listas · {parsed.errors.length} con error</p>
            {parsed.errors.length > 0 && (
              <ul className="max-h-40 overflow-y-auto rounded border border-border p-2 text-xs text-destructive">
                {parsed.errors.map((e) => <li key={e.row}>Fila {e.row}: {e.message}</li>)}
              </ul>
            )}
          </div>
        )}
        <Button onClick={submit} disabled={busy || !parsed?.ok.length}>{busy ? "Guardando…" : `Guardar ${parsed?.ok.length ?? 0} productos`}</Button>
      </DialogContent>
    </Dialog>
  );
}

function TeachDialog({ code, products, onClose }: { code: string; products: any[]; onClose: () => void }) {
  const assign = useServerFn(adminAssignBarcode);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const owner = products.find((p) => (p.codigos_barras ?? []).includes(code));
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return products.filter((p) => !t || `${p.nombre} ${p.nombre_en ?? ""}`.toLowerCase().includes(t)).slice(0, 40);
  }, [products, q]);

  async function pick(p: any) {
    setBusy(true);
    try {
      const r = await assign({ data: { productId: p.id, code } });
      if (!r.ok) { scanFeedback(false); toast.error(`Este código ya pertenece a "${r.conflict}". No se guardó.`); return; }
      scanFeedback(true);
      await qc.invalidateQueries({ queryKey: ["admin-house-products"] });
      toast.success(`Código guardado en ${p.nombre}`);
      onClose();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>Guardar código {code}</DialogTitle></DialogHeader>
        {owner && <p className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive">Este código ya pertenece a "{owner.nombre}".</p>}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar el producto" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" autoFocus />
        <ul className="divide-y divide-border">
          {list.map((p) => (
            <li key={p.id}>
              <button type="button" disabled={busy} onClick={() => pick(p)} className="flex w-full items-center gap-2 py-2 text-left text-sm hover:bg-muted">
                {p.imagenUrl ? <img src={p.imagenUrl} alt="" className="h-8 w-8 rounded object-cover" /> : <div className="h-8 w-8 rounded bg-muted" />}
                <span className="flex-1">{p.nombre}</span>
                {(p.codigos_barras ?? []).length > 0 && <span className="text-xs text-muted-foreground">{p.codigos_barras.length} código(s)</span>}
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
