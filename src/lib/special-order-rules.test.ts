import { describe, expect, it } from "vitest";
import { assertSpecialPhoto, specialItemSchema } from "./special-order-rules";

const base = { foto: "special/u1/a.jpg", marca: "Goya", nombre: "Salsa", tamano: "8 oz", qty: 1, precio: 1.29 };

describe("pedido especial", () => {
  it("acepta precio hasta $200", () => expect(specialItemSchema.parse({ ...base, precio: 200 }).precio).toBe(200));
  it("rechaza precio mayor a $200", () => expect(() => specialItemSchema.parse({ ...base, precio: 200.01 })).toThrow());
  it("rechaza más de 20 unidades", () => expect(() => specialItemSchema.parse({ ...base, qty: 21 })).toThrow());
  it("rechaza foto de otro cliente", () => expect(() => assertSpecialPhoto("special/u2/a.jpg", "u1")).toThrow());
});
