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
 * - Lo demás → la cantidad pedida
 */
export function pickedQuantity(
  item: { pick_status?: string | null; cantidad: unknown; picked_weight_lb?: unknown },
  product: { vendido_por_lb?: unknown; peso_lb?: unknown } | undefined,
): number {
  if (item.pick_status === "no_habia") return 0;
  const w = Number(item.picked_weight_lb);
  const perUnit = Number(product?.peso_lb);
  if (product?.vendido_por_lb === true && w > 0 && perUnit > 0) return Math.round((w / perUnit) * 1000) / 1000;
  return Number(item.cantidad);
}
