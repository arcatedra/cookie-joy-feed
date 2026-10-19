import { describe, expect, it } from "vitest";
import { HOUSE_BEVERAGES_CATALOG } from "./house-beverages-catalog";
import { houseProductSchema, houseSubcategories, unitPriceCents } from "./house-store-rules";
describe("Bebidas aprobadas", () => {
  it("conserva 73 nuevos únicos en nueve grupos", () => {
    expect(HOUSE_BEVERAGES_CATALOG).toHaveLength(73);
    expect(new Set(HOUSE_BEVERAGES_CATALOG.map(p => p.id)).size).toBe(73);
    expect(new Set(HOUSE_BEVERAGES_CATALOG.map(p => `${p.nombre}|${p.tamano}`)).size).toBe(73);
    expect(houseSubcategories("Bebidas").map(c => HOUSE_BEVERAGES_CATALOG.filter(p => p.subcategoria === c.es).length)).toEqual([8,9,8,11,5,5,12,8,7]);
  });
  it("vende por unidad o paquete sin ofertas ni sobreprecio", () => {
    for (const p of HOUSE_BEVERAGES_CATALOG) {
      expect(p.vendido_por_lb).toBe(false);
      expect(p.precio_anterior).toBeNull();
      expect(unitPriceCents(p)).toBe(Math.round(p.precio * 100));
      expect(houseProductSchema.safeParse({ ...p, categoria: "Bebidas" }).success).toBe(true);
      expect(houseProductSchema.safeParse({ ...p, categoria: "Despensa" }).success).toBe(false);
    }
  });
  it("excluye alcohol y pendientes", () => {
    for (const p of HOUSE_BEVERAGES_CATALOG) {
      expect(p.alcohol_free).toBe(true);
      expect(p.nombre).not.toMatch(/cerveza|vino|sidra|licor|malta|kombucha/i);
    }
    expect(HOUSE_BEVERAGES_CATALOG.some(p => p.nombre.startsWith("Planet Oat"))).toBe(false);
    expect(HOUSE_BEVERAGES_CATALOG.some(p => p.nombre.startsWith("Sello Rojo"))).toBe(false);
  });
  for (const [name, size, price] of [
    ["Pure Life agua purificada", "28 × 16.9 fl oz", 7.99],
    ["Coca-Cola refresco original", "1.25 L", 2.19],
    ["Gatorade bebida deportiva naranja", "28 fl oz", 3.19],
    ["Jarritos refresco de mandarina", "1.5 L", 4.29],
    ["FOCO agua de coco 100% pura", "33.8 fl oz", 4.69],
  ] as const) it(`precio aprobado ${name}`, () => {
    expect(HOUSE_BEVERAGES_CATALOG.find(p => p.nombre === name && p.tamano === size)?.precio).toBe(price);
  });
});
