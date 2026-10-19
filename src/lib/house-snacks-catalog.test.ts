import { describe, expect, it } from "vitest";
import { HOUSE_SNACKS_CATALOG, HOUSE_SNACKS_CHEEZIT_FIX } from "./house-snacks-catalog";
import { houseProductSchema, houseSubcategories } from "./house-store-rules";

describe("Snacks aprobados", () => {
  it("contiene 67 productos únicos repartidos en los siete grupos", () => {
    expect(HOUSE_SNACKS_CATALOG).toHaveLength(67);
    expect(new Set(HOUSE_SNACKS_CATALOG.map((p) => p.nombre.toLowerCase())).size).toBe(67);
    expect(houseSubcategories("Snacks").map((c) => HOUSE_SNACKS_CATALOG.filter((p) => p.subcategoria === c.es).length)).toEqual([21, 16, 5, 9, 8, 6, 2]);
  });
  it("todo se vende por unidad/paquete y valida solo en Snacks", () => {
    for (const p of HOUSE_SNACKS_CATALOG) {
      expect(p.vendido_por_lb).toBe(false);
      expect(houseProductSchema.safeParse({ ...p, categoria: "Snacks" }).success).toBe(true);
      expect(houseProductSchema.safeParse({ ...p, categoria: "Despensa" }).success).toBe(false);
    }
  });
  it("usa los precios regulares indicados", () => {
    const price = (n: string) => HOUSE_SNACKS_CATALOG.find((p) => p.nombre === n)?.precio;
    expect(price("Doritos Nacho Cheese tamaño fiesta")).toBe(7.29);
    expect(price("Frito Lay Classic Mix")).toBe(14.99);
    expect(price("Hershey's chocolate con leche")).toBe(1.99);
    expect(price("Jack Link's Teriyaki")).toBe(9.59);
    expect(HOUSE_SNACKS_CHEEZIT_FIX.precio).toBe(4.19);
  });
  it("guarda UPC solo en los cinco tamaños confirmados", () => {
    expect(HOUSE_SNACKS_CATALOG.filter((p) => "codigo_barras" in p).map((p) => (p as { codigo_barras: string }).codigo_barras).sort()).toEqual(
      ["0020685001642", "0028400517799", "0029000072107", "0038000138430", "36306053"],
    );
  });
});
