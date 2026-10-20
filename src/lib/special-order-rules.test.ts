import { describe, expect, it } from "vitest";
import { assertSameSupermarket, assertSpecialPhoto, SPECIAL_SAME_STORE_MESSAGE, specialItemSchema } from "./special-order-rules";

const base = { foto: "special/u1/a.jpg", marca: "Goya", nombre: "Salsa", tamano: "8 oz", qty: 1, precio: 1.29, supermercado: "Supermercado El Valle, 123 Main St, Bronx" };

describe("pedido especial", () => {
  it("acepta precio hasta $200", () => expect(specialItemSchema.parse({ ...base, precio: 200 }).precio).toBe(200));
  it("rechaza precio mayor a $200", () => expect(() => specialItemSchema.parse({ ...base, precio: 200.01 })).toThrow());
  it("rechaza más de 20 unidades", () => expect(() => specialItemSchema.parse({ ...base, qty: 21 })).toThrow());
  it("rechaza foto de otro cliente", () => expect(() => assertSpecialPhoto("special/u2/a.jpg", "u1")).toThrow());
  it("exige el supermercado", () => expect(() => specialItemSchema.parse({ ...base, supermercado: " " })).toThrow());
  it("acepta varios artículos del mismo supermercado", () =>
    expect(() => assertSameSupermarket([base, { ...base, supermercado: "supermercado el valle,  123 main st, bronx" }])).not.toThrow());
  it("rechaza artículos de supermercados distintos con el mensaje exacto", () =>
    expect(() => assertSameSupermarket([base, { ...base, supermercado: "Otro Super, Queens" }])).toThrow(SPECIAL_SAME_STORE_MESSAGE));
});
