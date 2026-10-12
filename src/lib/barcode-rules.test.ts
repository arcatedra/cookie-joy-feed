import { describe, expect, it } from "vitest";
import { barcodesMatch, normalizeBarcode, parseBarcodeList, pendingPicks, pickedQuantity, productHasBarcode } from "./barcode-rules";
import { parseBulkRows, houseProductSchema } from "./house-store-rules";

describe("códigos de barras", () => {
  it("acepta solo 8 a 14 números", () => {
    expect(normalizeBarcode("0 12345-67890 5")).toBe("012345678905");
    expect(normalizeBarcode("1234567")).toBeNull();
    expect(normalizeBarcode("123456789012345")).toBeNull();
  });
  it("lee varios códigos y detecta los inválidos", () => {
    expect(parseBarcodeList("012345678905; 0012345678905, 012345678905")).toEqual({
      codes: ["012345678905", "0012345678905"],
      invalid: [],
    });
    expect(parseBarcodeList("12AB34; 123").invalid).toEqual(["12AB34", "123"]);
  });
  it("UPC-A y EAN-13 con cero inicial coinciden", () => {
    expect(barcodesMatch("012345678905", "0012345678905")).toBe(true);
    expect(productHasBarcode(["012345678905"], "0012345678905")).toBe(true);
    expect(productHasBarcode(["012345678905"], "012345678912")).toBe(false);
    expect(productHasBarcode([], "012345678905")).toBe(false);
  });
  it("plantilla en bloque guarda varios códigos y rechaza letras", () => {
    const base = { nombre: "X", categoria: "Despensa", precio: "1", peso_lb: "1" };
    const r = parseBulkRows([{ ...base, codigos_barras: "012345678905;0012345678905" }, { ...base, codigos_barras: "abc" }]);
    expect(r.ok[0].codigos_barras).toEqual(["012345678905", "0012345678905"]);
    expect(r.errors[0].row).toBe(3);
  });
  it("el formulario rechaza códigos inválidos", () => {
    const base = { nombre: "X", categoria: "Despensa", precio: 1, peso_lb: 1 };
    expect(houseProductSchema.safeParse({ ...base, codigos_barras: ["12a"] }).success).toBe(false);
    expect(houseProductSchema.safeParse({ ...base, codigos_barras: ["012345678905"] }).success).toBe(true);
  });
});

describe("compra en el súper", () => {
  it("no deja marcar listo con artículos pendientes", () => {
    expect(pendingPicks([{ pick_status: "encontrado" }, { pick_status: "pendiente" }, {}])).toBe(2);
    expect(pendingPicks([{ pick_status: "encontrado" }, { pick_status: "reemplazado" }, { pick_status: "no_habia" }])).toBe(0);
  });
  it("No había no se cobra; por libra usa el peso real", () => {
    expect(pickedQuantity({ pick_status: "no_habia", cantidad: 3 }, undefined)).toBe(0);
    expect(pickedQuantity({ pick_status: "reemplazado", cantidad: 2 }, undefined)).toBe(2);
    // 2 porciones de ~1.5 lb, pesó 2.4 lb → 1.6 porciones
    expect(pickedQuantity({ pick_status: "encontrado", cantidad: 2, picked_weight_lb: 2.4 }, { vendido_por_lb: true, peso_lb: 1.5 })).toBe(1.6);
    expect(pickedQuantity({ pick_status: "encontrado", cantidad: 2, picked_weight_lb: 2.4 }, { vendido_por_lb: false, peso_lb: 1 })).toBe(2);
  });
});
