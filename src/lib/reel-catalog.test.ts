import { describe, expect, it } from "vitest";
import { resolveProductoForReel } from "./reel-catalog";
import type { Producto } from "./productos.functions";

const cinnamon: Producto = {
  id: "a1111111-0000-0000-0000-000000000002", nombre: "Snickerdoodle", disponible: true,
  descripcion: null, precio: 3.75, categoria: "cookies", imagen_url: null,
};
const products = new Map([[cinnamon.id, cinnamon]]);
describe("reels vinculados al sabor real del catálogo", () => {
  it("canela apunta a Snickerdoodle y nunca a Snicker", () => {
    expect(resolveProductoForReel("p-snicker", products)).toBe(cinnamon);
    const wrong = new Map([[cinnamon.id, { ...cinnamon, nombre: "Snicker" }]]);
    expect(resolveProductoForReel("p-snicker", wrong)).toBeNull();
  });
  it("no asigna sabores similares a reels sin producto correcto", () => {
    for (const slug of ["p-cc", "p-doublechoc", "p-pista", "unknown"]) {
      expect(resolveProductoForReel(slug, products)).toBeNull();
    }
  });
  it("oculta productos no disponibles y espera al catálogo", () => {
    expect(resolveProductoForReel("p-snicker", new Map([[cinnamon.id, { ...cinnamon, disponible: false }]]))).toBeNull();
    expect(resolveProductoForReel("p-snicker", null)).toBeNull();
    expect(resolveProductoForReel(undefined, products)).toBeNull();
  });
});