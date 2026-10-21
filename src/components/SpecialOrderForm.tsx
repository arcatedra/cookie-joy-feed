import { useState } from "react";
import { toast } from "sonner";
import { Camera, PackageSearch, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SPECIAL_MAX_QTY, SPECIAL_SAME_STORE_MESSAGE, specialItemSchema, type SpecialItem } from "@/lib/special-order-rules";

export function SpecialOrderForm({ items, onChange, L }: { items: SpecialItem[]; onChange: (v: SpecialItem[]) => void; L: (es: string, en: string) => string }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [f, setF] = useState({ marca: "", nombre: "", tamano: "", qty: "1", precio: "", peso: "", supermercado: "" });
  const [busy, setBusy] = useState(false);

  async function save() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return toast.error(L("Inicia sesión para hacer un pedido especial.", "Sign in to place a special order."));
    if (!file || !file.type.startsWith("image/") || file.size > 8_000_000) return toast.error(L("Sube una foto del producto (máx. 8 MB).", "Upload a product photo (max 8 MB)."));
    if (items.length > 0 && f.supermercado.trim().toLowerCase().replace(/\s+/g, " ") !== items[0].supermercado.trim().toLowerCase().replace(/\s+/g, " ")) {
      return toast.error(SPECIAL_SAME_STORE_MESSAGE);
    }
    setBusy(true);
    try {
      const path = `special/${u.user.id}/${crypto.randomUUID()}.${(file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "")}`;
      const item = specialItemSchema.parse({ foto: path, marca: f.marca, nombre: f.nombre, tamano: f.tamano, qty: Number(f.qty), precio: Number(f.precio), pesoLb: Number(f.peso), supermercado: f.supermercado });
      const { error } = await supabase.storage.from("store-media").upload(path, file, { contentType: file.type });
      if (error) throw new Error(L("No se pudo subir la foto.", "Could not upload the photo."));
      onChange([...items, item]);
      setF({ marca: "", nombre: "", tamano: "", qty: "1", precio: "", peso: "", supermercado: items.length ? f.supermercado : "" });
      setFile(null);
      setOpen(false);
      toast.success(L("Agregado al carrito", "Added to cart"));
    } catch (e) {
      toast.error(e instanceof Error && !e.message.startsWith("[") ? e.message : L(`Revisa los datos: precio, peso en libras y cantidad 1–${SPECIAL_MAX_QTY}.`, `Check the details: price, weight in pounds and quantity 1–${SPECIAL_MAX_QTY}.`));
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";
  return (
    <section className="mx-4 mt-4 rounded-2xl bg-primary p-4 text-primary-foreground shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-foreground/20">
            <Camera className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold">{L("Pedido especial", "Special order")}</h2>
            <p className="text-sm font-medium opacity-90">{L("¿No lo encuentras? Mándanos la foto y lo compramos por ti.", "Can't find it? Send us a photo and we'll buy it for you.")}</p>
          </div>
        </div>
        <Button size="sm" variant={open ? "outline" : "secondary"} className={open ? "" : "font-bold"} onClick={() => setOpen(!open)}>{open ? L("Cerrar", "Close") : L("Pedir", "Request")}</Button>
      </div>
      {items.length > 0 && (
        <ul className="mt-3 space-y-2 text-sm">
          {items.map((it, i) => (
            <li key={it.foto} className="flex items-center justify-between gap-2 rounded-lg bg-primary-foreground/15 px-3 py-2">
              <span className="min-w-0">
                <span className="block truncate font-medium">{it.qty} × {it.marca} {it.nombre} {it.tamano} · {it.pesoLb} lb</span>
                <span className="block truncate text-xs opacity-90">{it.supermercado}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-base font-extrabold">${(it.precio * it.qty).toFixed(2)}</span>
                <button aria-label={L("Quitar", "Remove")} onClick={() => onChange(items.filter((_, j) => j !== i))}><X className="h-4 w-4" /></button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <div className="mt-3 grid gap-2 text-foreground sm:grid-cols-2">
          <label className={`${input} flex cursor-pointer items-center gap-2 sm:col-span-2`}>
            <Camera className="h-4 w-4" /> {file ? file.name : L("Foto del producto", "Product photo")}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <input className={input} placeholder={L("Marca (ej: Goya)", "Brand (e.g. Goya)")} value={f.marca} onChange={(e) => setF({ ...f, marca: e.target.value })} />
          <input className={input} placeholder={L("Producto (ej: Salsa de tomate)", "Product (e.g. Tomato sauce)")} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} />
          <input className={input} placeholder={L("Tamaño (ej: 8 oz)", "Size (e.g. 8 oz)")} value={f.tamano} onChange={(e) => setF({ ...f, tamano: e.target.value })} />
          <input className={input} type="number" min={1} max={SPECIAL_MAX_QTY} placeholder={L("Cantidad", "Quantity")} value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} />
          <label className="sm:col-span-2">
            <span className="mb-1 block text-sm font-bold text-primary-foreground">{L("Precio por unidad (USD) *", "Price per unit (USD) *")}</span>
            <input className={`${input} text-xl font-extrabold`} type="number" step="0.01" min={0.5} placeholder="$0.00" value={f.precio} onChange={(e) => setF({ ...f, precio: e.target.value })} />
          </label>
          <input className={input} type="number" step="0.01" min={0.01} max={45} placeholder={L("Peso en libras * (ej: 1.5)", "Weight in pounds * (e.g. 1.5)")} value={f.peso} onChange={(e) => setF({ ...f, peso: e.target.value })} />
          <label className="sm:col-span-2">
            <span className="mb-1 block text-sm font-bold text-primary-foreground">{L("Supermercado donde está el producto *", "Supermarket where the product is *")}</span>
            <input className={input} placeholder={L("Nombre y dirección o zona (ej: Supermercado El Valle, 123 Main St, Bronx)", "Name and address or area (e.g. El Valle Market, 123 Main St, Bronx)")} value={f.supermercado} onChange={(e) => setF({ ...f, supermercado: e.target.value })} />
          </label>
          <p className="text-xs text-primary-foreground/90 sm:col-span-2">{L("Todos los artículos del pedido deben ser del mismo supermercado. El pedido completo no puede superar 45 lb. Pagas este precio con tu pedido; si no lo encontramos, te devolvemos ese monto completo.", "All items in the order must be from the same supermarket. The whole order cannot exceed 45 lb. You pay this price with your order; if we can't find it, we refund that full amount.")}</p>
          <Button className="sm:col-span-2" variant="secondary" disabled={busy} onClick={save}>{busy ? L("Guardando…", "Saving…") : L("Agregar al carrito", "Add to cart")}</Button>
        </div>
      )}
    </section>
  );
}
