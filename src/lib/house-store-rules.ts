import { z } from "zod";

/** Slug fijo de la tienda propia de Hazorex. */
export const HOUSE_STORE_SLUG = "hazorex-supermercado";

export const HOUSE_CATEGORIES: { es: string; en: string }[] = [
  { es: "Frutas y verduras", en: "Produce" },
  { es: "Carnes y mariscos", en: "Meat & seafood" },
  { es: "Lácteos y huevos", en: "Dairy & eggs" },
  { es: "Panadería", en: "Bakery" },
  { es: "Congelados", en: "Frozen" },
  { es: "Despensa", en: "Pantry" },
  { es: "Bebidas", en: "Beverages" },
  { es: "Snacks", en: "Snacks" },
  { es: "Limpieza", en: "Cleaning" },
  { es: "Cuidado personal", en: "Personal care" },
  { es: "Bebé", en: "Baby" },
  { es: "Mascotas", en: "Pets" },
];

export function categoryEn(es: string): string {
  return HOUSE_CATEGORIES.find((c) => c.es === es)?.en ?? es;
}

const money = z.coerce.number().min(0.01, "Precio inválido").max(10000);

export const houseProductSchema = z.object({
  id: z.string().uuid().optional(),
  nombre: z.string().trim().min(1, "Falta el nombre").max(160),
  nombre_en: z.string().trim().max(160).default(""),
  categoria: z.string().trim().refine((c) => HOUSE_CATEGORIES.some((x) => x.es === c), "Categoría no válida"),
  precio: money,
  precio_anterior: z.coerce.number().min(0).max(10000).nullable().default(null),
  tamano: z.string().trim().max(60).default(""),
  peso_lb: z.coerce.number().positive("El peso en lb es obligatorio").max(200),
  vendido_por_lb: z.boolean().default(false),
  disponible: z.boolean().default(true),
  stock: z.coerce.number().int().min(0).max(100000).nullable().default(null),
  super: z.string().trim().max(120).default(""),
  direccion: z.string().trim().max(240).default(""),
  imagen_url: z.string().max(500).nullable().default(null),
});
export type HouseProductInput = z.infer<typeof houseProductSchema>;

export const TEMPLATE_HEADERS = [
  "nombre", "nombre_en", "categoria", "precio", "precio_anterior", "tamano",
  "peso_lb", "por_libra", "disponible", "stock", "super", "direccion",
] as const;

function yes(v: unknown, def: boolean): boolean {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return def;
  return ["si", "sí", "yes", "y", "1", "true", "x"].includes(s);
}
function num(v: unknown): number | null {
  const s = String(v ?? "").trim().replace(/[$,]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/** Convierte filas de CSV/Excel en productos válidos y lista de errores por fila. */
export function parseBulkRows(rows: Record<string, unknown>[]) {
  const ok: HouseProductInput[] = [];
  const errors: { row: number; message: string }[] = [];
  rows.forEach((raw, i) => {
    const r: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) r[k.trim().toLowerCase()] = v;
    if (Object.values(r).every((v) => String(v ?? "").trim() === "")) return;
    const pa = num(r.precio_anterior);
    const st = num(r.stock);
    const parsed = houseProductSchema.safeParse({
      nombre: r.nombre ?? "",
      nombre_en: r.nombre_en ?? "",
      categoria: String(r.categoria ?? "").trim(),
      precio: num(r.precio) ?? 0,
      precio_anterior: pa,
      tamano: r.tamano ?? "",
      peso_lb: num(r.peso_lb) ?? 0,
      vendido_por_lb: yes(r.por_libra, false),
      disponible: yes(r.disponible, true),
      stock: st,
      super: r.super ?? "",
      direccion: r.direccion ?? "",
      imagen_url: null,
    });
    if (parsed.success) ok.push(parsed.data);
    else errors.push({ row: i + 2, message: parsed.error.issues.map((x) => x.message).join("; ") });
  });
  return { ok, errors };
}

export function discountPct(precio: number, anterior: number | null | undefined): number {
  if (!anterior || anterior <= precio) return 0;
  return Math.round(((anterior - precio) / anterior) * 100);
}
