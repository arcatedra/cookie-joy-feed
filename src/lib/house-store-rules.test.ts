import { describe, expect, it } from "vitest";
import { discountPct, parseBulkRows, productPhotoPatch, houseProductSchema } from "./house-store-rules";
import { DEFAULT_PRICING, tierForWeight, weightFeeCents } from "./pricing";

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
