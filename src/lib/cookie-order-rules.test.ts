import { describe, expect, it } from "vitest";
import { assertCookieSubtotal, assertPostTipAllowed, cookieDeliveryFeeCents, stopCompensation, vehicleOrderLimit } from "./cookie-order-rules";
describe("reglas de apertura sin pagos reales", () => {
  it("no hay mínimo: 1 galleta paga subtotal + entrega fija de $12", () => {
    expect(() => assertCookieSubtotal(350)).not.toThrow();
    expect(() => assertCookieSubtotal(0)).toThrow();
    expect(() => assertCookieSubtotal(NaN)).toThrow();
    expect(cookieDeliveryFeeCents({ cookieDeliveryFeeUsd: 12 })).toBe(1200);
    expect(350 + cookieDeliveryFeeCents({ cookieDeliveryFeeUsd: 12 })).toBe(1550);
    expect(cookieDeliveryFeeCents({ cookieDeliveryFeeUsd: 9.5 })).toBe(950);
    expect(cookieDeliveryFeeCents(null)).toBe(1200);
    expect(cookieDeliveryFeeCents({ cookieDeliveryFeeUsd: -1 })).toBe(1200);
  });
  it("propina extra solo entre $1 y $100 y dentro de 24 horas", () => {
    const now = Date.parse("2026-10-11T12:00:00Z");
    expect(() => assertPostTipAllowed(3, "2026-10-11T00:00:00Z", now)).not.toThrow();
    expect(() => assertPostTipAllowed(3, "2026-10-10T11:59:00Z", now)).toThrow("24 horas");
    expect(() => assertPostTipAllowed(0.5, "2026-10-11T00:00:00Z", now)).toThrow();
    expect(() => assertPostTipAllowed(101, "2026-10-11T00:00:00Z", now)).toThrow();
    expect(() => assertPostTipAllowed(3, null, now)).toThrow("entregado");
  });
  it("respeta límites inclusivos de peso y extra máximo", () => {
    expect(stopCompensation(15).baseCents).toBe(500);
    expect(stopCompensation(15.01).baseCents).toBe(550);
    expect(stopCompensation(30).baseCents).toBe(550);
    expect(stopCompensation(30.01).baseCents).toBe(600);
    expect(stopCompensation(45).driverWeightCents).toBe(0);
    expect(stopCompensation(50, 3)).toMatchObject({customerWeightCents:350,driverWeightCents:125,totalCents:1025});
    expect(stopCompensation(100).driverWeightCents).toBe(500);
    expect(stopCompensation(100, 3, true).totalCents).toBe(800);
  });
  it("limita vehículos y suma el ejemplo honesto", () => {
    expect(vehicleOrderLimit("e-bike")).toBe(3);
    expect(vehicleOrderLimit("auto")).toBe(6);
    expect(vehicleOrderLimit("van")).toBe(10);
    expect([5,10,20,40].reduce((sum, w) => sum + stopCompensation(w).totalCents,0)).toBe(2150);
  });
});