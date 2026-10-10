import { describe, expect, it } from "vitest";
import { assertCookieMinimum, stopCompensation, vehicleOrderLimit } from "./cookie-order-rules";
describe("reglas de apertura sin pagos reales", () => {
  it("exige $12 antes de propina o saldo", () => {
    expect(() => assertCookieMinimum(1199)).toThrow("$0.01");
    expect(() => assertCookieMinimum(1200)).not.toThrow();
    expect(() => assertCookieMinimum(NaN)).toThrow();
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