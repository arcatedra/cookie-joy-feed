import { describe, expect, it } from "vitest";
import { allowedActions, assertAction, cookieDeliveryDate } from "./admin-cookie-order-rules";

describe("admin pedidos de galletas", () => {
  it("solo permite el paso siguiente", () => {
    expect(allowedActions({ estado: "pagado", monto_capturado: 27 })).toEqual(["preparando", "reembolsar"]);
    expect(() => assertAction({ estado: "pagado", monto_capturado: 27 }, "entregado")).toThrow();
  });
  it("no deja reembolsar dos veces ni sin cobro", () => {
    expect(() => assertAction({ estado: "reembolsado", monto_capturado: 27 }, "reembolsar")).toThrow();
    expect(() => assertAction({ estado: "pendiente", monto_capturado: null }, "reembolsar")).toThrow();
    expect(allowedActions({ estado: "pendiente", monto_capturado: null })).toEqual(["cancelar"]);
  });
  it("calcula lunes/miércoles/viernes del día siguiente", () => {
    expect(cookieDeliveryDate("2026-10-11T03:00:00Z")).toBe("2026-10-12"); // sábado NY → lunes
    expect(cookieDeliveryDate("2026-10-12T15:00:00Z")).toBe("2026-10-14"); // lunes → miércoles
  });
});
