import { describe, expect, it } from "vitest";
import { HOUSE_FRUIT_CATALOG } from "./house-fruit-catalog";
import { HOUSE_VEGETABLE_CATALOG } from "./house-vegetable-catalog";
import { houseProductSchema, parseBulkRows, unitPriceCents } from "./house-store-rules";

// Owner-verified Food Bazaar prices, October 18, 2026; independent expected values.
const expected = [
  ["Aguacate dominicano grande", 2.99, false],
  ["Aguacate Florida grande", 2.50, false],
  ["Guineo verde", 0.27, false],
  ["Manzana Gala", 0.99, true],
  ["Manzana Pink Lady", 1.00, false],
  ["Manzana Honeycrisp", 0.99, true],
  ["Manzana Granny Smith", 0.99, false],
  ["Manzana Fuji orgánica", 1.26, false],
  ["Limón verde", 0.29, false],
  ["Limones amarillos bolsa 2 lb", 3.50, false],
  ["Pera Bartlett", 2.49, true],
  ["Pera Bosc", 1.99, true],
  ["Pera roja", 1.99, true],
  ["Uvas rojas sin semilla", 2.99, true],
  ["Uvas negras sin semilla", 3.99, true],
  ["Uvas Red Globe", 1.99, true],
  ["Naranja grande", 1.00, false],
  ["Naranja Cara Cara", 1.00, false],
  ["Toronja roja", 1.50, false],
  ["Frambuesas 6 oz", 3.99, false],
  ["Moras 6 oz", 3.99, false],
  ["Arándanos 16 oz", 4.99, false],
  ["Dátiles Medjool 14 oz", 7.99, false],
  ["Granada", 5.99, false],
  ["Caqui Fuyu", 1.50, false],
  ["Ciruela negra", 0.87, false],
  ["Melocotón", 1.21, false],
  ["Nectarina blanca", 2.99, true],
  ["Melón honeydew", 5.99, false],
  ["Sandía sin semilla", 1.29, true],
  ["Melón cantalupe cortado", 3.99, true],
  ["Ensalada de frutas", 3.99, true],
  ["Piña cortada", 3.49, true],
  ["Piña entera", 3.00, false],
  ["Mango rojo", 1.99, false],
  ["Pitahaya amarilla", 6.99, true],
  ["Coco", 1.99, false],
  ["Lechosa", 1.99, true],
  ["Lichi", 3.99, true],
  ["Kiwi SunGold 1 lb", 6.99, false],
  ["Mamey", 4.99, true],
  ["Nance", 7.99, true],
  ["Alcachofa", 2.99, false],
  ["Espárragos", 5.99, true],
  ["Brócoli", 2.49, true],
  ["Coliflor", 2.99, false],
  ["Ají pimiento verde", 1.99, true],
  ["Pimiento rojo", 1.79, true],
  ["Pimiento naranja", 1.79, true],
  ["Mini pimientos dulces", 3.00, true],
  ["Ají serrano", 4.99, true],
  ["Ají cubanela", 3.29, true],
  ["Ají dulce", 5.99, true],
  ["Habichuelas verdes", 2.49, true],
  ["Guisantes tirabeques", 3.99, true],
  ["Coles de Bruselas", 2.99, true],
  ["Pepino inglés", 2.00, false],
  ["Berenjena", 1.49, true],
  ["Sábila", 2.00, false],
  ["Caña de azúcar", 3.99, false],
  ["Tomatillo", 1.99, true],
  ["Tomate en rama", 2.49, true],
  ["Tomate pera", 1.99, true],
  ["Tomate cherry", 2.00, false],
  ["Rábanos manojo", 1.49, false],
  ["Nabo blanco", 0.99, true],
  ["Remolacha manojo", 2.50, false],
  ["Yautía blanca", 4.99, true],
  ["Papas Idaho 5 lb", 3.50, false],
  ["Batata", 1.99, true],
  ["Hongos portobello 8 oz", 2.00, false],
  ["Hongos shiitake", 5.99, true],
  ["Cebollín", 0.75, false],
  ["Cebolla amarilla 2 lb", 2.00, false],
  ["Ajo bolsa", 2.00, false],
  ["Chayote", 0.67, false],
  ["Calabacín", 1.99, true],
  ["Calabacín amarillo", 1.70, false],
  ["Lechuga hoja verde", 0.95, false],
  ["Lechuga romana", 2.50, false],
  ["Escarola", 1.49, true],
  ["Col rizada", 1.49, true],
  ["Repollo verde", 0.59, true],
  ["Apio", 1.50, false],
  ["Cilantro", 1.99, false],
  ["Recao", 1.99, false],
  ["Ensalada mixta 12 oz", 2.95, false],
] as const;

describe("Food Bazaar: 0 % de sobreprecio", () => {
  it.each(expected)("%s conserva precio %s y modalidad por libra %s", (name, price, perLb) => {
    const matches = [...HOUSE_FRUIT_CATALOG, ...HOUSE_VEGETABLE_CATALOG].filter(p => p[0] === name);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.[2]).toBe(price);
    expect(matches[0]?.[3]).toBe(perLb);
  });
  it("precio del admin y CSV: $3.99 queda $3.99 sin sumar 5 %", () => {
    const admin = houseProductSchema.parse({ nombre: "Fresas", categoria: "Frutas y verduras", precio: 3.99, peso_lb: 1 });
    const bulk = parseBulkRows([{ nombre: "Fresas", categoria: "Frutas y verduras", precio: "3.99", peso_lb: "1", por_libra: "no" }]);
    expect(admin.precio).toBe(3.99);
    expect(unitPriceCents(admin)).toBe(399);
    expect(bulk.ok[0]?.precio).toBe(3.99);
    expect(bulk.errors).toEqual([]);
  });
  it("sandía a $1.29/lb, peso aproximado 12 lb y estimado $15.48", () => {
    const melon = HOUSE_FRUIT_CATALOG.find(p => p[0] === "Sandía sin semilla");
    expect(melon?.[2]).toBe(1.29);
    expect(melon?.[3]).toBe(true);
    expect(melon?.[4]).toBe(12);
    if (!melon) throw new Error("Falta sandía");
    expect(unitPriceCents({ precio: melon[2], vendido_por_lb: melon[3], peso_lb: melon[4] })).toBe(1548);
  });
  it("guineos: $0.79/lb × 2 lb = $1.58 sin aumento", () => {
    expect(unitPriceCents({ precio: 0.79, vendido_por_lb: true, peso_lb: 2 })).toBe(158);
  });
  it("productos no indicados conservan precios y modalidades previas", () => {
    const unchanged = [["Higos dorados 9 oz", 6.81, false], ["Papa blanca", 1.20, false], ["Berza", 2.61, true]] as const;
    for (const [name, price, perLb] of unchanged) {
      const p = [...HOUSE_FRUIT_CATALOG, ...HOUSE_VEGETABLE_CATALOG].find(p => p[0] === name);
      expect(p?.[2]).toBe(price);
      expect(p?.[3]).toBe(perLb);
    }
  });
});
