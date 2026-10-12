import { describe, expect, it } from "vitest";
import { HOUSE_PANTRY_CATALOG } from "./house-pantry-catalog";
import { houseProductSchema, houseSubcategories } from "./house-store-rules";

describe("Despensa aprobada", () => {
  it("contiene 72 productos únicos ES/EN y los siete grupos indicados", () => {
    expect(HOUSE_PANTRY_CATALOG).toHaveLength(72);
    for (const field of ["nombre", "nombre_en"] as const) {
      expect(new Set(HOUSE_PANTRY_CATALOG.map((p) => p[field].toLowerCase())).size).toBe(72);
    }
    expect(houseSubcategories("Despensa").map((c) => HOUSE_PANTRY_CATALOG.filter((p) => p.subcategoria === c.es).length)).toEqual([10, 8, 15, 7, 12, 12, 8]);
  });
  it("valida todos por unidad, con descripciones y marca en ambos idiomas", () => {
    for (const p of HOUSE_PANTRY_CATALOG) {
      expect(houseProductSchema.safeParse({ ...p, categoria: "Despensa" }).success).toBe(true);
      expect(p.vendido_por_lb).toBe(false);
      expect(p.descripcion.length).toBeGreaterThan(10);
      expect(p.descripcion_en.length).toBeGreaterThan(10);
      expect(p.nombre.split(" ")[0]).toBe(p.nombre_en.split(" ")[0]);
      expect(houseProductSchema.safeParse({ ...p, categoria: "Panadería" }).success).toBe(false);
    }
  });
  it("conserva exactamente los precios y pesos solicitados", () => {
    expect(HOUSE_PANTRY_CATALOG.map((p) => [p.precio, p.peso_lb])).toEqual([
      [19.94,20],[8.28,5],[23.09,20],[5.97,2],[3.77,.75],[5.55,1],[4.61,1],[3.56,1],[2.4,1],[6.81,1.75],
      [2.61,1],[2.61,1],[2.61,1],[2.61,1],[2.61,1],[4.19,1],[6.71,.8],[8.28,1.1],
      [1.98,.35],[2.4,.2],[6.29,.8],[2.09,1],[2.3,1],[1.98,1],[1.98,1],[1.88,1],[4.19,.9],[1.14,.55],[1.35,.55],[3.98,1.8],[5.03,1.9],[3.56,.95],[3.14,.3],
      [9.44,2.1],[3.03,1.3],[15.74,2],[6.5,1.1],[5.24,1],[3.77,1.2],[5.45,.4],
      [27.29,8],[9.02,2.6],[16.26,8],[19.52,1.8],[4.19,8.5],[7.23,.4],[3.87,1],[6.29,1.75],[2.72,1.6],[6.92,.5],[4.71,1.5],[4.92,1.5],
      [3.87,2],[8.07,5],[6.29,4],[2.3,1],[2.93,.9],[3.77,.9],[1.67,1],[3.87,1.2],[4.61,1],[3.66,1],[3.45,.9],[4.71,2.2],
      [10.91,2.6],[8.81,2],[8.81,1.5],[4.08,1.5],[6.29,2],[4.19,1.1],[9.44,1.1],[6.71,.8],
    ]);
  });
  it("no inventa tamaños que el dueño no indicó", () => {
    expect(HOUSE_PANTRY_CATALOG.filter((p) => !p.tamano).map((p) => p.nombre)).toEqual([
      "Goya Sazón culantro y achiote", "Maggi sazonador todo uso", "Duncan Hines mezcla para brownie",
      "Duncan Hines mezcla para pastel de fresa", "Quaker Simply granola miel y almendras",
    ]);
  });
});