import { describe, expect, it } from "vitest";
import { discountPct, parseBulkRows, productPhotoPatch, houseProductSchema } from "./house-store-rules";
import { DEFAULT_PRICING, tierForWeight, weightFeeCents } from "./pricing";
import { HOUSE_FRUIT_CATALOG } from "./house-fruit-catalog";
import { HOUSE_VEGETABLE_CATALOG } from "./house-vegetable-catalog";
import { productDescription, unitPriceCents } from "./house-store-rules";
import { HOUSE_MEAT_CATALOG } from "./house-meat-catalog";
import { HOUSE_MEAT_SUBCATEGORIES, houseSubcategories } from "./house-store-rules";

describe("catálogo de carnes y mariscos", () => {
  it("valida los 64 productos únicos y las seis subcategorías", () => {
    expect(HOUSE_MEAT_CATALOG).toHaveLength(64);
    expect(new Set(HOUSE_MEAT_CATALOG.map((p) => p.nombre)).size).toBe(64);
    expect(new Set(HOUSE_MEAT_CATALOG.map((p) => p.nombre_en)).size).toBe(64);
    expect(HOUSE_MEAT_SUBCATEGORIES.map((c) => HOUSE_MEAT_CATALOG.filter((p) => p.subcategoria === c.es).length)).toEqual([14, 14, 9, 3, 14, 10]);
    for (const p of HOUSE_MEAT_CATALOG) {
      expect(houseProductSchema.safeParse({ ...p, categoria: "Carnes y mariscos" }).success).toBe(true);
      expect(p.descripcion.length).toBeGreaterThan(10);
      expect(p.descripcion_en.length).toBeGreaterThan(10);
    }
  });
  it("rechaza subcategorías ajenas y conserva las omitidas", () => {
    const base = { nombre: "Pollo", categoria: "Carnes y mariscos", precio: 2.09, peso_lb: 5 };
    expect(houseProductSchema.parse(base).subcategoria).toBeUndefined();
    expect(houseProductSchema.safeParse({ ...base, subcategoria: "Frutas" }).success).toBe(false);
    expect(houseProductSchema.safeParse({ ...base, categoria: "Frutas y verduras", subcategoria: "Res" }).success).toBe(false);
    expect(houseSubcategories("Despensa")).toEqual([]);
    const bulk = parseBulkRows([{ ...base, subcategoria: "Pollo y pavo", por_libra: "sí" }]);
    expect(bulk.ok[0]?.subcategoria).toBe("Pollo y pavo");
  });
  it("conserva unidades y pesos exactos sin duplicar marcas", () => {
    const pollo = HOUSE_MEAT_CATALOG.find((p) => p.nombre === "Pollo entero");
    const lobster = HOUSE_MEAT_CATALOG.find((p) => p.nombre_en === "Lobster tail");
    const clams = HOUSE_MEAT_CATALOG.find((p) => p.nombre_en === "Littleneck clams");
    if (!pollo || !lobster || !clams) throw new Error("Faltan productos requeridos");
    expect(unitPriceCents(pollo)).toBe(1045);
    expect(unitPriceCents(lobster)).toBe(1732);
    expect(unitPriceCents(clams)).toBe(79);
    expect(HOUSE_MEAT_CATALOG.filter((p) => !p.vendido_por_lb)).toHaveLength(4);
    for (const p of HOUSE_MEAT_CATALOG) expect(p.nombre).not.toMatch(/Oscar Mayer|Butterball|Sabrett|Hillshire/);
  });
});

describe("catálogo de frutas", () => {
  it("incluye 43 frutas distintas sin duplicar las cuatro existentes", () => {
    expect(HOUSE_FRUIT_CATALOG).toHaveLength(43);
    expect(new Set(HOUSE_FRUIT_CATALOG.map((p) => p[0])).size).toBe(43);
    const names = HOUSE_FRUIT_CATALOG.map((p) => p[0]);
    for (const name of ["Aguacate Hass grande", "Guineos / plátanos", "Uvas verdes sin semilla", "Fresas Driscoll's"]) expect(names).not.toContain(name);
  });
  it("valida pesos, unidades y descripciones bilingües", () => {
    for (const [nombre, nombre_en, precio, vendido_por_lb, peso_lb, descripcion, descripcion_en] of HOUSE_FRUIT_CATALOG) {
      expect(houseProductSchema.safeParse({ nombre, nombre_en, precio, vendido_por_lb, peso_lb, descripcion, descripcion_en, categoria: "Frutas y verduras", subcategoria: "Frutas" }).success).toBe(true);
      expect(descripcion.length).toBeGreaterThan(10);
      expect(descripcion_en.length).toBeGreaterThan(10);
    }
    expect(unitPriceCents({ precio: 1.56, vendido_por_lb: true, peso_lb: 0.4 })).toBe(62);
    expect(unitPriceCents({ precio: 16.58, vendido_por_lb: false, peso_lb: 15 })).toBe(1658);
  });
  it("conserva campos omitidos y rechaza subcategorías inválidas", () => {
    const p = houseProductSchema.parse({ nombre: "Mango", precio: 2, peso_lb: 0.8, categoria: "Frutas y verduras" });
    expect(p.descripcion).toBeUndefined();
    expect(p.subcategoria).toBeUndefined();
    expect(houseProductSchema.safeParse({ ...p, subcategoria: "Otra" }).success).toBe(false);
    expect(productDescription({ descripcion: "Fruta fresca", descripcion_en: "Fresh fruit" }, true)).toBe("Fresh fruit");
    const bulk = parseBulkRows([{ nombre: "Mango", precio: 2, peso_lb: 0.8, categoria: "Frutas y verduras", subcategoria: "Frutas", descripcion: "Mango dulce", descripcion_en: "Sweet mango" }]);
    expect(bulk.ok[0]?.descripcion_en).toBe("Sweet mango");
    expect(bulk.ok[0]?.subcategoria).toBe("Frutas");
  });
});

describe("catálogo de verduras", () => {
  it("incluye las partes 2A y 2B una sola vez y valida los 59 productos", () => {
    expect(HOUSE_VEGETABLE_CATALOG).toHaveLength(59);
    expect(new Set(HOUSE_VEGETABLE_CATALOG.map((p) => p[0])).size).toBe(59);
    for (const [nombre, nombre_en, precio, vendido_por_lb, peso_lb, descripcion, descripcion_en] of HOUSE_VEGETABLE_CATALOG) {
      expect(houseProductSchema.safeParse({ nombre, nombre_en, precio, vendido_por_lb, peso_lb, descripcion, descripcion_en, categoria: "Frutas y verduras", subcategoria: "Verduras" }).success).toBe(true);
      expect(descripcion.length).toBeGreaterThan(10);
      expect(descripcion_en.length).toBeGreaterThan(10);
    }
  });
  it("cobra la porción de tomatillo y la bolsa de papas correctamente", () => {
    const tomatillo = HOUSE_VEGETABLE_CATALOG.find((p) => p[0] === "Tomatillo");
    const papas = HOUSE_VEGETABLE_CATALOG.find((p) => p[0] === "Papas Idaho 5 lb");
    expect(tomatillo).toBeDefined();
    expect(papas).toBeDefined();
    if (!tomatillo || !papas) throw new Error("Falta un producto requerido");
    expect(unitPriceCents({ precio: tomatillo[2], vendido_por_lb: tomatillo[3], peso_lb: tomatillo[4] })).toBe(220);
    expect(unitPriceCents({ precio: papas[2], vendido_por_lb: papas[3], peso_lb: papas[4] })).toBe(471);
  });
});

describe("supermercado Hazorex", () => {
  it("conserva crédito al editar precios y elimina crédito al reemplazar la foto", () => {
    expect(productPhotoPatch({ imagen_url: null })).toEqual({});
    expect(productPhotoPatch({ imagen_url: null, codigo_barras: "0076808000287" })).toEqual({ codigo_barras: "0076808000287" });
    expect(productPhotoPatch({ imagen_url: "house/nueva.jpg" })).toEqual({ imagen_url: "house/nueva.jpg", foto_credito: null, foto_origen_url: null, foto_licencia: null, foto_original_url: null, foto_fondo_editado: false });
  });
  it("guarda códigos como texto sin perder ceros y rechaza códigos inventados", () => {
    const base = { nombre: "Espaguetis", categoria: "Despensa", precio: 2.61, peso_lb: 1 };
    expect(houseProductSchema.parse({ ...base, codigo_barras: "0076808000287" }).codigo_barras).toBe("0076808000287");
    expect(houseProductSchema.safeParse({ ...base, codigo_barras: "ABC" }).success).toBe(false);
  });
  it("valida filas del CSV y exige peso en lb", () => {
    const { ok, errors } = parseBulkRows([
      { nombre: "Leche", categoria: "Lácteos y huevos", precio: "$3.99", peso_lb: "8.6", por_libra: "no" },
      { nombre: "Pan", categoria: "Panadería", precio: "2.5", peso_lb: "" },
      { nombre: "X", categoria: "Juguetes", precio: "1", peso_lb: "1" },
      { nombre: "", categoria: "", precio: "", peso_lb: "" },
    ]);
    expect(ok).toHaveLength(1);
    expect(ok[0].precio).toBe(3.99);
    expect(errors.map((e) => e.row)).toEqual([3, 4]);
  });
  it("calcula el % de descuento", () => {
    expect(discountPct(3, 4)).toBe(25);
    expect(discountPct(3, null)).toBe(0);
  });
  it("cobra la entrega del carrito por peso", () => {
    // Agua 27 lb + Ginger Ale 10 lb = 37 lb → grande $39.99
    expect(tierForWeight(37, DEFAULT_PRICING).feeCents).toBe(3999);
    expect(weightFeeCents(54, DEFAULT_PRICING)).toBe(720);
  });
});

describe("precio por libra", () => {
  it("cobra la porción estimada", async () => {
    const { unitPriceCents } = await import("./house-store-rules");
    expect(unitPriceCents({ precio: 0.83, peso_lb: 2, vendido_por_lb: true })).toBe(166);
    expect(unitPriceCents({ precio: 1.05, peso_lb: 0.5, vendido_por_lb: false })).toBe(105);
  });
});
