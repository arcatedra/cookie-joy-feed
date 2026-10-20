import { z } from "zod";

/** Límites del "Pedido especial" del Supermercado (precio que declara el cliente). */
export const SPECIAL_MAX_PRICE_USD = 200;
export const SPECIAL_MAX_QTY = 20;

export const specialItemSchema = z.object({
  foto: z.string().min(1).max(300),
  marca: z.string().trim().min(1).max(80),
  nombre: z.string().trim().min(1).max(120),
  tamano: z.string().trim().min(1).max(60),
  qty: z.number().int().min(1).max(SPECIAL_MAX_QTY),
  precio: z.number().min(0.5).max(SPECIAL_MAX_PRICE_USD),
  /** Supermercado donde está el producto: nombre y dirección o zona. */
  supermercado: z.string().trim().min(3).max(120),
});

export const SPECIAL_SAME_STORE_MESSAGE = "Todos los artículos del pedido deben ser del mismo supermercado";

const normalizeStore = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** Todos los artículos especiales del pedido deben ser de UN solo supermercado. */
export function assertSameSupermarket(items: Array<Pick<SpecialItem, "supermercado">>) {
  if (items.length < 2) return;
  const first = normalizeStore(items[0].supermercado);
  if (items.some((it) => normalizeStore(it.supermercado) !== first)) {
    throw new Error(SPECIAL_SAME_STORE_MESSAGE);
  }
}
export type SpecialItem = z.infer<typeof specialItemSchema>;

export const specialCartKey = (businessId: string) => `hzx-special-${businessId}`;

/** La foto debe estar en la carpeta propia del cliente. */
export function assertSpecialPhoto(path: string, userId: string) {
  if (!path.startsWith(`special/${userId}/`) || path.includes("..")) {
    throw new Error("La foto del pedido especial no es válida.");
  }
}

export const specialPriceCents = (s: Pick<SpecialItem, "precio">) => Math.round(s.precio * 100);
