import { describe, expect, it } from "vitest";
import { DEFAULT_BLOCK_CONFIG, blockConfigSchema, blockOrderQuote, blockVehicleCapacity, estimateBlockMinutes, assertPublishableBlock, assertBlockOrderCount, manualBlockPay } from "./delivery-block-rules";
describe("bloques reservables: reglas sin cobros reales", () => {
  it("usa límites de peso inclusivos y un único cargo", () => {
    for (const [lb, cents] of [[15,1200],[15.01,2500],[30,2500],[30.01,3500],[45,3500],[50,3850],[80,5950]]) expect(blockOrderQuote(lb,"lobby").deliveryCents).toBe(cents);
    expect(() => blockOrderQuote(80.01,"lobby")).toThrow("Divide");
    expect(() => blockOrderQuote(NaN,"lobby")).toThrow();
  });
  it("separa bono de puerta de cargo y propinas", () => {
    expect(blockOrderQuote(15,"elevator")).toMatchObject({deliveryCents:1200,doorCents:500,doorMinutes:5});
    expect(blockOrderQuote(15,"stairs")).toMatchObject({doorCents:800,doorMinutes:8});
  });
  it("configura vehículos, tiempo y montos sin cambiar históricos", () => {
    expect(["bicicleta","bici_carga","moto","auto","van"].map((v) => blockVehicleCapacity(v))).toEqual([50,200,60,400,1000]);
    expect(blockVehicleCapacity("unknown")).toBe(0);
    expect(estimateBlockMinutes([{weightLb:15,door:"elevator"},{weightLb:30,door:"stairs"}])).toBe(40);
    const c={...DEFAULT_BLOCK_CONFIG,smallUsd:14};expect(blockOrderQuote(10,"lobby",c).deliveryCents).toBe(1400);
  });
  it("bloquea importes inferiores y duraciones fuera de rango", () => {
    expect(() => assertPublishableBlock(22.99,60)).toThrow("$23.00");
    expect(() => assertPublishableBlock(40,120)).toThrow("$46.00");
    expect(() => assertPublishableBlock(46,120)).not.toThrow();
    expect(() => assertPublishableBlock(100,241)).toThrow();
    expect(blockConfigSchema.safeParse({...DEFAULT_BLOCK_CONFIG,smallMaxLb:40}).success).toBe(false);
  });
  it("nunca crea lotes de uno o dos pedidos", () => {
    expect(() => assertBlockOrderCount(1)).toThrow("al menos 3");
    expect(() => assertBlockOrderCount(2)).toThrow("al menos 3");
    expect(() => assertBlockOrderCount(3)).not.toThrow();
    expect(() => assertBlockOrderCount(8)).not.toThrow();
  });
  it("solo aumenta pago manualmente y deja el bono de puerta apagado", () => {
    expect(manualBlockPay(40, 0, false, 8)).toBe(40);
    expect(manualBlockPay(40, 5, false, 8)).toBe(45);
    expect(manualBlockPay(40, 10, true, 6)).toBe(56);
    expect(() => manualBlockPay(40, -5, false, 0)).toThrow();
  });
});