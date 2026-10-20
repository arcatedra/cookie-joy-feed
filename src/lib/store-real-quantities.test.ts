import { describe, expect, it } from "vitest";
import { pickedQuantity, readyQuantities, validateUnitQuantity } from "./barcode-rules";

describe("cantidades reales de tienda", () => {
  const item = { id: "item", product_id: "product", pick_status: "encontrado", cantidad: 3 };
  const products = new Map([["product", { vendido_por_lb: false, peso_lb: 1 }]]);
  it("3 pedidas y 2 reales calculan 2 y conservan ese valor al reintentar", () => {
    const result = readyQuantities([item], products, [{ itemId: "item", cantidadReal: 2 }]);
    expect(result).toEqual([{ itemId: "item", cantidadReal: 2 }]);
    expect(readyQuantities([{ ...item, cantidad_real: result[0].cantidadReal }], products, [])[0].cantidadReal).toBe(2);
    expect(pickedQuantity({ ...item, cantidad_real: 2 }, products.get("product"))).toBe(2);
  });
  it("mantiene 3 cuando se entregan todas", () => {
    expect(readyQuantities([item], products, [])[0].cantidadReal).toBe(3);
  });
  it("acepta cero sin cobrar unidades no entregadas", () => {
    expect(readyQuantities([item], products, [{ itemId: "item", cantidadReal: 0 }])[0].cantidadReal).toBe(0);
  });
  it("un reemplazo parcial cobra 2 de 3", () => {
    const replacements = new Map([...products, ["replacement", { vendido_por_lb: false, peso_lb: 1 }] as const]);
    expect(readyQuantities([{ ...item, pick_status: "reemplazado", replacement_product_id: "replacement", cantidad_real: 2 }], replacements, [])[0].cantidadReal).toBe(2);
  });
  it("No había siempre es cero", () => {
    expect(readyQuantities([{ ...item, pick_status: "no_habia" }], products, [{ itemId: "item", cantidadReal: 3 }])[0].cantidadReal).toBe(0);
  });
  it("rechaza negativos, infinitos, NaN y cantidades superiores a 3", () => {
    for (const real of [-1, Infinity, NaN, 4]) expect(() => validateUnitQuantity(real, 3)).toThrow();
  });
  it("rechaza artículos ajenos", () => {
    expect(() => readyQuantities([item], products, [{ itemId: "other", cantidadReal: 2 }])).toThrow();
  });
  it("rechaza duplicados", () => {
    expect(() => readyQuantities([item], products, [{ itemId: "item", cantidadReal: 2 }, { itemId: "item", cantidadReal: 1 }])).toThrow();
  });
  it("escribir 2 no evita revisar el producto", () => {
    expect(() => readyQuantities([{ ...item, pick_status: "pendiente" }], products, [{ itemId: "item", cantidadReal: 2 }])).toThrow(/Faltan/);
  });
  it("por libra conserva 2.4 lb, no el número escrito", () => {
    expect(readyQuantities([{ ...item, picked_weight_lb: 2.4 }], new Map([["product", { vendido_por_lb: true, peso_lb: 1.5 }]]), [{ itemId: "item", cantidadReal: 3 }])[0].cantidadReal).toBe(1.6);
  });
  it("exige peso real antes del cobro", () => {
    expect(() => readyQuantities([item], new Map([["product", { vendido_por_lb: true, peso_lb: 1.5 }]]), [])).toThrow(/peso real/);
  });
});