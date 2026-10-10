import { queryOptions, useQuery } from "@tanstack/react-query";
import { listProductos, type Producto } from "./productos.functions";

const SPANISH_NAMES: Record<string, string> = {
  "Chocolate Chunk": "Chocolate con trozos de chocolate",
  Snickerdoodle: "Canela y azúcar",
  "Oatmeal Raisin": "Avena y pasas",
  "Mint Chocolate": "Chocolate y menta",
  Pistachio: "Pistacho",
  "Triple Chocolate": "Triple chocolate",
  Snicker: "Chocolate y caramelo Snicker",
};
export function spanishCookieName(name: string) { return SPANISH_NAMES[name] ?? name; }
export function normalizeCookie(p: Producto) { return { ...p, nombre: spanishCookieName(p.nombre) }; }
export const cookieCatalogOptions = queryOptions({
  queryKey: ["cookie-catalog"],
  queryFn: async () => (await listProductos()).map(normalizeCookie),
  staleTime: 60_000,
});
export function useCookieCatalog() { return useQuery(cookieCatalogOptions); }
export function legacyCookieProduct(id: string, products: Producto[]) {
  const match = id.match(/^(?:shop-)?c(\d+)$/);
  if (!match) return products.find((p) => p.id === id);
  const index = Number(match[1]);
  // Stable historical menu IDs, not alphabetical positions.
  const suffix = ["", "1", "2", "3", "6", "3", "a", "7", "9", "9", "4"][index];
  return suffix ? products.find((p) => p.id === `a1111111-0000-0000-0000-00000000000${suffix}`) : undefined;
}