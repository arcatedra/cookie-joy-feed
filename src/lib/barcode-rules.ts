/** Reglas puras de códigos de barras y de la compra en el súper (cliente y servidor). */
import { z } from "zod";

export const BARCODE_RE = /^\d{8,14}$/;

/** Deja solo números. Devuelve null si no es un UPC/EAN válido (8 a 14 dígitos). */
export function normalizeBarcode(raw: unknown): string | null {
  const s = String(raw ?? "").replace(/\D/g, "");
  return BARCODE_RE.test(s) ? s : null;
}

/** "123; 456, 789" → lista única de códigos válidos + los inválidos encontrados. */
export function parseBarcodeList(raw: unknown): { codes: string[]; invalid: string[] } {
  const parts = Array.isArray(raw) ? raw.map(String) : String(raw ?? "").split(/[;,\s|]+/);
  const codes: string[] = [];
  const invalid: string[] = [];
  for (const p of parts) {
    const t = p.trim();
    if (!t) continue;
    const n = normalizeBarcode(t);
    if (n && /^\d+$/.test(t.replace(/[\s-]/g, ""))) {
      if (!codes.includes(n)) codes.push(n);
    } else invalid.push(t);
  }
  return { codes, invalid };
}

/** Forma canónica para comparar: UPC-A (12) y EAN-13 con 0 inicial son el mismo código. */
export function canonicalBarcode(code: string): string {
  return code.replace(/^0+(?=\d{8})/, "");
}

export function barcodesMatch(a: string, b: string): boolean {
  return canonicalBarcode(a) === canonicalBarcode(b);
}

export function productHasBarcode(codes: readonly string[] | null | undefined, code: string): boolean {
  return (codes ?? []).some((c) => barcodesMatch(c, code));
}

/** Variantes que hay que buscar en la base (con y sin ceros iniciales hasta 14 dígitos). */
export function barcodeVariants(code: string): string[] {
  const base = canonicalBarcode(code);
  const out = new Set<string>([code, base]);
  for (let s = base; s.length < 14; ) {
    s = `0${s}`;
    out.add(s);
  }
  return [...out];
}

export const barcodeListSchema = z
  .array(z.string().regex(BARCODE_RE, "Código de barras inválido"))
  .max(20)
  .transform((l) => [...new Set(l)]);

export type PickStatus = "pendiente" | "encontrado" | "reemplazado" | "no_habia";
export const DONE_PICK: readonly PickStatus[] = ["encontrado", "reemplazado", "no_habia"];

export function pendingPicks(items: { pick_status?: string | null }[]): number {
  return items.filter((i) => !DONE_PICK.includes((i.pick_status ?? "pendiente") as PickStatus)).length;
}

/**
 * Cantidad a cobrar (en unidades del carrito) según lo comprado.
 * - No había → 0
 * - Por libra con peso real → peso real / peso por unidad
 * - Por unidad → cantidad real guardada, o pedida si no se ha ajustado
 */
export function pickedQuantity(
  item: { pick_status?: string | null; cantidad: unknown; cantidad_real?: unknown; picked_weight_lb?: unknown },
  product: { vendido_por_lb?: unknown; peso_lb?: unknown } | undefined,
): number {
  if (item.pick_status === "no_habia") return 0;
  const w = Number(item.picked_weight_lb);
  const perUnit = Number(product?.peso_lb);
  if (product?.vendido_por_lb === true && w > 0 && perUnit > 0) return Math.round((w / perUnit) * 1000) / 1000;
  return product?.vendido_por_lb === true ? Number(item.cantidad) : validateUnitQuantity(item.cantidad_real ?? item.cantidad, item.cantidad);
}

export function validateUnitQuantity(real: unknown, ordered: unknown): number {
  const n = Number(real);
  const limit = Number(ordered);
  if (!Number.isFinite(n) || !Number.isFinite(limit) || n < 0 || n > limit) {
    throw new Error("Cantidad real inválida: debe estar entre 0 y la cantidad pedida.");
  }
  return n;
}

/** Valida el pedido completo antes de guardar cantidades o iniciar el cobro. */
export function pickedProductId(item: { product_id?: string | null; replacement_product_id?: string | null; pick_status?: string | null }): string {
  if (item.pick_status === "reemplazado") {
    if (!item.replacement_product_id) throw new Error("Falta el producto de reemplazo. Vuelve a revisarlo antes de cobrar.");
    return item.replacement_product_id;
  }
  return item.product_id ?? "";
}

export function readyQuantities(
  items: { id: string; product_id?: string | null; replacement_product_id?: string | null; pick_status?: string | null; cantidad: unknown; cantidad_real?: unknown; picked_weight_lb?: unknown }[],
  products: Map<string, { vendido_por_lb?: unknown; peso_lb?: unknown }>,
  requested: { itemId: string; cantidadReal: number }[],
): { itemId: string; cantidadReal: number }[] {
  const pending = pendingPicks(items);
  if (pending > 0) throw new Error(`Faltan ${pending} artículo(s) por revisar (Encontrado, Reemplazado o No había).`);
  const ids = new Set(items.map((it) => it.id));
  const overrides = new Map<string, number>();
  for (const entry of requested) {
    if (!ids.has(entry.itemId) || overrides.has(entry.itemId)) throw new Error("Artículo ajeno al pedido o duplicado.");
    if (!Number.isFinite(entry.cantidadReal) || entry.cantidadReal < 0) throw new Error("Cantidad real inválida.");
    overrides.set(entry.itemId, entry.cantidadReal);
  }
  return items.map((it) => {
    if (it.pick_status === "no_habia") return { itemId: it.id, cantidadReal: 0 };
    const product = products.get(pickedProductId(it));
    if (it.pick_status === "reemplazado" && (!product || typeof product.vendido_por_lb !== "boolean" || !Number.isFinite(Number(product.peso_lb)) || Number(product.peso_lb) <= 0)) {
      throw new Error("Falta la forma de venta o el peso del reemplazo. No se inició el cobro.");
    }
    if (product?.vendido_por_lb === true) {
      const weight = Number(it.picked_weight_lb);
      const portion = Number(product.peso_lb);
      if (!Number.isFinite(weight) || weight <= 0 || weight > 200 || !Number.isFinite(portion) || portion <= 0) {
        throw new Error("Falta un peso real válido para un artículo por libra.");
      }
      return { itemId: it.id, cantidadReal: pickedQuantity(it, product) };
    }
    return { itemId: it.id, cantidadReal: validateUnitQuantity(overrides.get(it.id) ?? it.cantidad_real ?? it.cantidad, it.cantidad) };
  });
}
