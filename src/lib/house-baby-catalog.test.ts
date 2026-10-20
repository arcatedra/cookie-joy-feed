import { describe, expect, it } from "vitest";
import { HOUSE_BABY_CATALOG } from "./house-baby-catalog";
import { HOUSE_BABY_SUBCATEGORIES, houseProductSchema, houseSubcategories } from "./house-store-rules";

describe("Bebé", () => {
  it("no duplica nombre + tamaño", () => {
    expect(new Set(HOUSE_BABY_CATALOG.map((r) => `${r[1]}|${r[3]}`)).size).toBe(HOUSE_BABY_CATALOG.length);
  });
  it("tiene las 11 subcategorías pedidas, todas con productos", () => {
    expect(houseSubcategories("Bebé")).toHaveLength(11);
    for (const s of HOUSE_BABY_SUBCATEGORIES) {
      expect(HOUSE_BABY_CATALOG.some((r) => r[0] === s.es)).toBe(true);
    }
  });
  it("los pañales indican talla y cantidad", () => {
    for (const r of HOUSE_BABY_CATALOG.filter((r) => r[0] === "Pañales por talla")) {
      expect(r[3]).toMatch(/^Talla \d · \d+ ct$/);
    }
  });
  it("cada producto pasa la validación del supermercado", () => {
    for (const [subcategoria, nombre, nombre_en, tamano, precio, peso_lb] of HOUSE_BABY_CATALOG) {
      expect(houseProductSchema.safeParse({ nombre, nombre_en, tamano, precio, peso_lb, categoria: "Bebé", subcategoria }).success).toBe(true);
    }
  });
  it("usa el precio regular, no el de oferta", () => {
    const price = (n: string) => HOUSE_BABY_CATALOG.find((r) => r[1] === n)?.[4];
    expect(price("Pampers Baby Dry pañales talla 4")).toBe(15.99);
    expect(price("Huggies Little Movers pañales talla 3")).toBe(16.79);
    expect(price("Sesame Street biberón Sesame Beginnings")).toBe(2.99);
  });
});
