import { describe, expect, it } from "vitest";
import { HOUSE_PETS_CATALOG } from "./house-pets-catalog";
import { houseProductSchema, houseSubcategories, unitPriceCents } from "./house-store-rules";

describe("Lista exclusiva de Mascotas del dueño", () => {
  it("incluye exactamente 201 presentaciones únicas", () => {
    expect(HOUSE_PETS_CATALOG).toHaveLength(201);
    expect(new Set(HOUSE_PETS_CATALOG.map(p => p.nombre + "|" + p.tamano)).size).toBe(201);
    expect(new Set(HOUSE_PETS_CATALOG.map(p => p.id)).size).toBe(201);
  });
  it("conserva las ocho subcategorías y la cantidad de cada grupo", () => {
    expect(houseSubcategories("Mascotas").map(c => c.es)).toEqual([
      "Comida seca para perros", "Comida húmeda para perros", "Premios para perros", "Accesorios (pads)",
      "Comida seca para gatos", "Comida húmeda para gatos", "Premios para gatos", "Arena para gatos y accesorios",
    ]);
    expect(houseSubcategories("Mascotas").map(c => HOUSE_PETS_CATALOG.filter(p => p.subcategoria === c.es).length)).toEqual([20,26,11,3,28,60,14,39]);
  });
  it("cobra por unidad sin sobreprecio", () => {
    for (const p of HOUSE_PETS_CATALOG) {
      expect(unitPriceCents({ ...p, vendido_por_lb: false })).toBe(Math.round(p.precio * 100));
      expect(houseProductSchema.safeParse({ ...p, categoria: "Mascotas", vendido_por_lb: false }).success).toBe(true);
    }
  });
  it("no permite clasificar mascotas en Bebé", () => {
    expect(houseProductSchema.safeParse({ ...HOUSE_PETS_CATALOG[0], categoria: "Bebé" }).success).toBe(false);
  });
  const checks: [string,string,number][] = [
    ["Fancy Feast pollo y pavo","3 lb",12.69],
    ["IAMS Proactive pollo adulto","3.5 lb",14.49],
    ["Fancy Feast Gravy Lovers corazones e hígado de pollo","3 oz",1.50],
    ["Arm & Hammer Clump & Seal Ultra Odor Blasters","19 lb",21.99],
    ["Pedigree adulto pequeño pollo asado y vegetales","3.5 lb",8.89],
    ["Purina Moist & Meaty hamburguesa con queso","12 ct",10.39],
    ["Bogopa pads de entrenamiento","50 ct",12.99],
    ["Bogopa pads","100 ct",22.99],
    ["Bogopa pads","200 ct",49.99],
    ["Fancy Feast Petites pollo a la parrilla","2 x 1.4 oz",1.49],
    ["Fancy Feast variedad Gravy Lovers pollo y res","24 x 3 oz",32.99],
    ["Sheba Perfect Portions pavo asado","2 x 37.5 g",1.79],
    ["Friskies Prime Filets res","5.5 oz",1.30],
    ["World's Best original sin perfume","15 lb",24.99],
    ["Jonny Cat bolsas para caja de arena","5 ct",4.29],
  ];
  for (const [nombre,tamano,precio] of checks) {
    it(`conserva precio original de ${nombre} ${tamano}`, () => {
      expect(HOUSE_PETS_CATALOG.find(p => p.nombre===nombre && p.tamano===tamano)?.precio).toBe(precio);
    });
  }
});
