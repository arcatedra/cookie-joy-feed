import { describe, expect, it } from "vitest";
import { HOUSE_BAKERY_CATALOG } from "./house-bakery-catalog";
import { HOUSE_DAIRY_CATALOG } from "./house-dairy-catalog";

const bakeryBrands = ["Bogopa", "Bimbo", "Schmidt Old Tyme", "Pepperidge Farm", "Nature's Own", "Schmidt Old Tyme", "Dave's Killer Bread 21 Whole Grains", "The Rustik Oven", "Pepperidge Farm Farmhouse", "King's Hawaiian", "Ball Park", "Ball Park", "St Pierre", "Bogopa", "St Pierre", "Martin's", "Thomas'", "Thomas'", "Thomas'", null, "Thomas'", "Thomas'", "Entenmann's", "Bauducco", "The Father's Table", null, null, null, null, null, "Entenmann's", "La Banderita", "La Banderita", "Old El Paso", "Tropical", "Tropical", "Stonefire", "Stonefire"];
const dairyBrands = ["Bogopa", "Organic Valley", "Organic Valley", "Organic Valley", "Lactaid", "Horizon Organic", "Horizon Organic", "Horizon Organic", "Farmland Fresh Dairies", "Farmland Fresh Dairies", "Farmland Fresh Dairies", "Farmland Fresh Dairies", "Daisy", "Daisy", "Bogopa", "Bogopa", "Pete and Gerry's", "Happy Egg", "Tropical", "Tropical", "La Ricura", "Tropical", "Kraft Singles", "Kraft", "Kraft", "Cracker Barrel", "BelGioioso", "Kraft", "Frigo Cheese Heads", "Gopi", "Babybel", "Chobani", "Chobani", "Chobani", "Noosa", "So Delicious", "Bogopa", "Kerrygold", "Breakstone's", "Land O Lakes", "Organic Valley"];

describe("marcas aprobadas ES/EN", () => {
  it("añade las 73 marcas correctas al inicio de ambos nombres", () => {
    expect(bakeryBrands.filter(Boolean)).toHaveLength(32);
    for (const [catalog, brands] of [[HOUSE_BAKERY_CATALOG, bakeryBrands], [HOUSE_DAIRY_CATALOG, dairyBrands]] as const) {
      catalog.forEach((p, i) => {
        const brand = brands[i];
        if (!brand) return;
        expect(p.nombre.startsWith(`${brand} `)).toBe(true);
        expect(p.nombre_en.startsWith(`${brand} `)).toBe(true);
      });
    }
  });
  it("conserva exactamente los seis productos de panadería sin marca", () => {
    expect(HOUSE_BAKERY_CATALOG.filter((_, i) => !bakeryBrands[i]).map((p) => p.nombre)).toEqual(["Bagel individual", "Pastelito de manzana 4 oz", "Pastelito de cereza 4 oz", "Pastel de pina", "Pastel de calabaza", "Brownie grande"]);
  });
  it("conserva todos los precios y pesos de lácteos", () => {
    expect(HOUSE_DAIRY_CATALOG.map((p) => [p.precio, p.peso_lb])).toEqual([
      [5.24,8.6],[8.91,4.3],[8.91,4.3],[8.91,4.3],[9.12,4.3],[10.28,4.3],[14.69,3.2],[14.69,3.2],
      [5.24,1.1],[8.81,2.2],[4.61,2.2],[3.14,1.1],[4.19,1],[2.4,0.5],
      [2.4,2.4],[5.66,1.6],[6.81,1.4],[8.81,1.6],
      [5.76,0.75],[5.76,0.75],[6.29,0.75],[7.34,1],[7.65,0.75],[7.65,0.75],[7.02,0.5],[7.34,0.5],[8.91,1],[7.02,0.5],[9.44,0.75],[8.91,0.5],[11.33,0.6],
      [10.28,1.4],[10.28,1.4],[2.93,0.35],[3.87,0.5],[3.56,0.35],
      [4.19,1],[7.97,0.5],[4.4,0.5],[4.4,1],[13.64,0.8],
    ]);
  });
});