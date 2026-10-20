import { describe, expect, it } from "vitest";
import { HOUSE_PERSONAL_CARE_CATALOG } from "./house-personal-care-catalog";
import { HOUSE_PERSONAL_CARE_SUBCATEGORIES, houseProductSchema, houseSubcategories } from "./house-store-rules";

describe("Cuidado personal", () => {
  it("no duplica nombre + tamaño", () => {
    expect(new Set(HOUSE_PERSONAL_CARE_CATALOG.map((r) => `${r[1]}|${r[3]}`)).size).toBe(HOUSE_PERSONAL_CARE_CATALOG.length);
  });
  it("tiene 12 subcategorías y todas con productos", () => {
    expect(houseSubcategories("Cuidado personal")).toHaveLength(12);
    for (const s of HOUSE_PERSONAL_CARE_SUBCATEGORIES) {
      expect(HOUSE_PERSONAL_CARE_CATALOG.filter((r) => r[0] === s.es).length).toBeGreaterThanOrEqual(8);
    }
  });
  it("cada producto pasa la validación del supermercado", () => {
    for (const [subcategoria, nombre, nombre_en, tamano, precio, peso_lb] of HOUSE_PERSONAL_CARE_CATALOG) {
      expect(houseProductSchema.safeParse({ nombre, nombre_en, tamano, precio, peso_lb, categoria: "Cuidado personal", subcategoria }).success).toBe(true);
    }
  });
  it("conserva precios regulares de la tienda", () => {
    const price = (n: string) => HOUSE_PERSONAL_CARE_CATALOG.find((r) => r[1] === n)?.[4];
    expect(price("Dove gel de baño Deep Moisture")).toBe(9.89);
    expect(price("Colgate pasta dental Cavity Protection")).toBe(2.99);
    expect(price("Eco Style gel Olive Oil fijación máxima")).toBe(10.49);
  });
});
