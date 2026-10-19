import { describe, expect, it } from "vitest";
import { HOUSE_CLEANING_CATALOG } from "./house-cleaning-catalog";
import { HOUSE_CLEANING_SUBCATEGORIES } from "./house-store-rules";

describe("Limpieza y hogar", () => {
  it("tiene 108 productos sin duplicar nombre + tamaño", () => {
    expect(HOUSE_CLEANING_CATALOG).toHaveLength(108);
    expect(new Set(HOUSE_CLEANING_CATALOG.map((r) => `${r[1]}|${r[3]}`)).size).toBe(108);
  });
  it("usa solo las 12 subcategorías, 9 productos cada una", () => {
    for (const s of HOUSE_CLEANING_SUBCATEGORIES) {
      expect(HOUSE_CLEANING_CATALOG.filter((r) => r[0] === s.es)).toHaveLength(9);
    }
  });
  it("conserva precios regulares de la tienda", () => {
    const price = (n: string, t: string) => HOUSE_CLEANING_CATALOG.find((r) => r[1] === n && r[3] === t)?.[4];
    expect(price("Tide detergente líquido Original", "125 fl oz")).toBe(35.99);
    expect(price("Fabuloso limpiador multiusos lavanda", "56 fl oz")).toBe(8.49);
    expect(price("Bounty Select-A-Size toallas de papel", "12 rollos")).toBe(39.99);
  });
});
