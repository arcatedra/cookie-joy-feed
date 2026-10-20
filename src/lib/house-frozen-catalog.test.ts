import { describe, expect, it } from "vitest";
import { HOUSE_FROZEN_CATALOG } from "./house-frozen-catalog";
import { HOUSE_FROZEN_SUBCATEGORIES, houseProductSchema, houseSubcategories } from "./house-store-rules";

describe("Congelados", () => {
  it("tiene 108 productos sin duplicar nombre + tamaño", () => {
    expect(HOUSE_FROZEN_CATALOG).toHaveLength(108);
    expect(new Set(HOUSE_FROZEN_CATALOG.map((r) => `${r[1]}|${r[3]}`)).size).toBe(108);
  });
  it("usa solo las 9 subcategorías, 12 productos cada una", () => {
    expect(HOUSE_FROZEN_SUBCATEGORIES).toHaveLength(9);
    expect(houseSubcategories("Congelados").map((s) => s.es)).toEqual(HOUSE_FROZEN_SUBCATEGORIES.map((s) => s.es));
    for (const s of HOUSE_FROZEN_SUBCATEGORIES) {
      expect(HOUSE_FROZEN_CATALOG.filter((r) => r[0] === s.es)).toHaveLength(12);
    }
  });
  it("cada producto pasa la validación del supermercado", () => {
    for (const [subcategoria, nombre, nombre_en, tamano, precio, peso_lb] of HOUSE_FROZEN_CATALOG) {
      const r = houseProductSchema.safeParse({ nombre, nombre_en, tamano, precio, peso_lb, categoria: "Congelados", subcategoria });
      expect(r.success).toBe(true);
    }
  });
  it("conserva precios regulares de la tienda", () => {
    const price = (n: string, t: string) => HOUSE_FROZEN_CATALOG.find((r) => r[1] === n && r[3] === t)?.[4];
    expect(price("Häagen-Dazs helado Chocolate", "14 fl oz")).toBe(8.99);
    expect(price("DiGiorno pizza Rising Crust Pepperoni", "24.7 oz")).toBe(10.39);
    expect(price("Goya maduros (plátanos maduros)", "40 oz")).toBe(11.99);
    expect(price("Old Orchard concentrado de jugo de naranja", "12 fl oz")).toBe(6.69);
  });
});
