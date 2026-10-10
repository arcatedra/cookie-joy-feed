import type { Producto } from "./productos.functions";

// Exact flavor associations only: similar-looking cookies are not substitutes.
const REEL_PRODUCTS: Record<string, { id: string; name: string }> = {
  "p-cchunk": { id: "a1111111-0000-0000-0000-000000000001", name: "Chocolate Chunk" },
  "p-snicker": { id: "a1111111-0000-0000-0000-000000000002", name: "Snickerdoodle" },
  "p-oatmeal": { id: "a1111111-0000-0000-0000-000000000003", name: "Oatmeal Raisin" },
  "p-mint": { id: "a1111111-0000-0000-0000-000000000004", name: "Mint Chocolate" },
  "p-triple": { id: "a1111111-0000-0000-0000-000000000006", name: "Triple Chocolate" },
  "p-mm": { id: "a1111111-0000-0000-0000-000000000007", name: "M&M Festivo" },
  "p-pb": { id: "a1111111-0000-0000-0000-000000000009", name: "Mantequilla de Maní Crujiente" },
};

export function resolveProductoForReel(
  slug: string | null | undefined,
  products: Map<string, Producto> | null | undefined,
): Producto | null {
  if (!slug || !products) return null;
  const association = REEL_PRODUCTS[slug];
  if (!association) return null;
  const product = products.get(association.id);
  if (!product?.disponible || product.nombre !== association.name) return null;
  return product;
}