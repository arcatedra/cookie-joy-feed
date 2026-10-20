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
});
export type SpecialItem = z.infer<typeof specialItemSchema>;

export const specialCartKey = (businessId: string) => `hzx-special-${businessId}`;

/** La foto debe estar en la carpeta propia del cliente. */
export function assertSpecialPhoto(path: string, userId: string) {
  if (!path.startsWith(`special/${userId}/`) || path.includes("..")) {
    throw new Error("La foto del pedido especial no es válida.");
  }
}

export const specialPriceCents = (s: Pick<SpecialItem, "precio">) => Math.round(s.precio * 100);
