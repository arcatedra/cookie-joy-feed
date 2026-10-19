import { z } from "zod";
import { barcodeListSchema, parseBarcodeList } from "./barcode-rules";

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

export const HOUSE_PRODUCE_SUBCATEGORIES = [{ es: "Frutas", en: "Fruit" }, { es: "Verduras", en: "Vegetables" }] as const;

export const HOUSE_MEAT_SUBCATEGORIES = [
  { es: "Pollo y pavo", en: "Chicken & turkey" },
  { es: "Res", en: "Beef" },
  { es: "Cerdo", en: "Pork" },
  { es: "Cordero y chivo", en: "Lamb & goat" },
  { es: "Pescado", en: "Fish" },
  { es: "Mariscos", en: "Shellfish" },
] as const;

export const HOUSE_DAIRY_SUBCATEGORIES = [
  { es: "Leche", en: "Milk" },
  { es: "Cremas", en: "Cream" },
  { es: "Huevos", en: "Eggs" },
  { es: "Quesos", en: "Cheese" },
  { es: "Yogur", en: "Yogurt" },
  { es: "Mantequilla", en: "Butter" },
] as const;

export const HOUSE_BAKERY_SUBCATEGORIES = [
  { es: "Pan de molde", en: "Sandwich bread" },
  { es: "Panecillos", en: "Rolls & buns" },
  { es: "Bagels y muffins", en: "Bagels & muffins" },
  { es: "Pasteles y postres", en: "Cakes & desserts" },
  { es: "Tortillas y arepas", en: "Tortillas & arepas" },
] as const;

export const HOUSE_PANTRY_SUBCATEGORIES = [
  { es: "Arroz y granos", en: "Rice & grains" },
  { es: "Pastas", en: "Pasta" },
  { es: "Enlatados", en: "Canned foods" },
  { es: "Salsas y condimentos", en: "Sauces & condiments" },
  { es: "Aceites y especias", en: "Oils & spices" },
  { es: "Para hornear", en: "Baking" },
  { es: "Desayuno", en: "Breakfast" },
] as const;

export const HOUSE_SNACK_SUBCATEGORIES = [
  { es: "Papas y chips", en: "Chips" },
  { es: "Galletas saladas", en: "Crackers" },
  { es: "Galletas dulces", en: "Cookies" },
  { es: "Chocolates y dulces", en: "Chocolate & candy" },
  { es: "Barras y frutos secos", en: "Bars & nuts" },
  { es: "Palomitas y pretzels", en: "Popcorn & pretzels" },
  { es: "Carne seca", en: "Jerky" },
] as const;

export const HOUSE_BEVERAGE_SUBCATEGORIES = [
  {
    "es": "Agua y agua con gas",
    "en": "Water & sparkling water"
  },
  {
    "es": "Refrescos",
    "en": "Soft drinks"
  },
  {
    "es": "Jugos y néctares",
    "en": "Juices & nectars"
  },
  {
    "es": "Bebidas deportivas y energéticas",
    "en": "Sports & energy drinks"
  },
  {
    "es": "Té y café listos para tomar",
    "en": "Ready-to-drink tea & coffee"
  },
  {
    "es": "Café y té (en grano, molido, cápsulas, bolsitas)",
    "en": "Coffee & tea (beans, ground, pods, bags)"
  },
  {
    "es": "Bebidas latinas",
    "en": "Latin drinks"
  },
  {
    "es": "Mezclas y bebidas en polvo",
    "en": "Drink mixes & powders"
  },
  {
    "es": "Agua de coco y bebidas vegetales",
    "en": "Coconut water & plant-based drinks"
  }
] as const;

export function houseSubcategories(category: string | null) {
  if (category === "Frutas y verduras") return HOUSE_PRODUCE_SUBCATEGORIES;
  if (category === "Carnes y mariscos") return HOUSE_MEAT_SUBCATEGORIES;
  if (category === "Lácteos y huevos") return HOUSE_DAIRY_SUBCATEGORIES;
  if (category === "Panadería") return HOUSE_BAKERY_SUBCATEGORIES;
  if (category === "Despensa") return HOUSE_PANTRY_SUBCATEGORIES;
  if (category === "Snacks") return HOUSE_SNACK_SUBCATEGORIES;
  if (category === "Bebidas") return HOUSE_BEVERAGE_SUBCATEGORIES;
  return [];
}

export function productDescription(p: { descripcion?: string | null; descripcion_en?: string | null }, en: boolean): string {
  return (en ? p.descripcion_en : p.descripcion) || "";
}

export const houseProductSchema = z.object({
  id: z.string().uuid().optional(),
  nombre: z.string().trim().min(1, "Falta el nombre").max(160),
  nombre_en: z.string().trim().max(160).default(""),
  descripcion: z.string().trim().max(240).optional(),
  descripcion_en: z.string().trim().max(240).optional(),
  subcategoria: z.enum(["Frutas", "Verduras", "Pollo y pavo", "Res", "Cerdo", "Cordero y chivo", "Pescado", "Mariscos", "Leche", "Cremas", "Huevos", "Quesos", "Yogur", "Mantequilla", "Pan de molde", "Panecillos", "Bagels y muffins", "Pasteles y postres", "Tortillas y arepas", "Arroz y granos", "Pastas", "Enlatados", "Salsas y condimentos", "Aceites y especias", "Para hornear", "Desayuno", "Papas y chips", "Galletas saladas", "Galletas dulces", "Chocolates y dulces", "Barras y frutos secos", "Palomitas y pretzels", "Carne seca", "Agua y agua con gas", "Refrescos", "Jugos y néctares", "Bebidas deportivas y energéticas", "Té y café listos para tomar", "Café y té (en grano, molido, cápsulas, bolsitas)", "Bebidas latinas", "Mezclas y bebidas en polvo", "Agua de coco y bebidas vegetales"]).nullable().optional(),
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
  codigo_barras: z.string().trim().regex(/^\d{8,14}$/, "Código de barras inválido").nullable().optional(),
  /** Varios UPC/EAN por producto; omitirlo conserva los guardados. */
  codigos_barras: barcodeListSchema.optional(),
}).refine((p) => !p.subcategoria || houseSubcategories(p.categoria).some((c) => c.es === p.subcategoria), {
  path: ["subcategoria"], message: "Subcategoría no válida para esta categoría",
});
export type HouseProductInput = z.infer<typeof houseProductSchema>;

/** Omitir metadatos conserva la foto; reemplazarla elimina el crédito de la foto anterior. */
export function productPhotoPatch(input: Pick<HouseProductInput, "imagen_url" | "codigo_barras">) {
  return {
    ...(input.codigo_barras !== undefined ? { codigo_barras: input.codigo_barras } : {}),
    ...(input.imagen_url !== null ? {
      imagen_url: input.imagen_url,
      foto_credito: null,
      foto_origen_url: null,
      foto_licencia: null,
      foto_original_url: null,
      foto_fondo_editado: false,
    } : {}),
  };
}

export const TEMPLATE_HEADERS = [
  "nombre", "nombre_en", "categoria", "precio", "precio_anterior", "tamano",
  "peso_lb", "por_libra", "disponible", "stock", "super", "direccion",
  "descripcion", "descripcion_en", "subcategoria", "codigos_barras",
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
    const bc = parseBarcodeList(r.codigos_barras);
    if (bc.invalid.length) {
      errors.push({ row: i + 2, message: `Código de barras inválido: ${bc.invalid.join(", ")}` });
      return;
    }
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
      descripcion: r.descripcion === undefined ? undefined : String(r.descripcion),
      descripcion_en: r.descripcion_en === undefined ? undefined : String(r.descripcion_en),
      subcategoria: String(r.subcategoria ?? "").trim() || null,
      ...(bc.codes.length ? { codigos_barras: bc.codes } : {}),
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

/** Precio de una unidad del carrito: los productos por libra cobran una porción estimada (precio/lb × peso aprox.). */
export function unitPriceCents(p: { precio: unknown; peso_lb?: unknown; vendido_por_lb?: unknown }): number {
  const precio = Number(p.precio);
  if (p.vendido_por_lb === true) return Math.round(precio * (Number(p.peso_lb) || 1) * 100);
  return Math.round(precio * 100);
}
