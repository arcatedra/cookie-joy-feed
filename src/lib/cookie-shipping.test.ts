import { describe, expect, it } from "vitest";
import { cookiePackCount, cookieUnitWeightLb, cookieWeightDelivery } from "./cookie-shipping.server";
import { DEFAULT_PRICING } from "./pricing";
import { cardPaymentQuote } from "./payment-processing.server";
import { assertCookieSubtotal } from "./cookie-order-rules";
import { cookieQuoteItemsSchema } from "./cookie-shipping.functions";

describe("envío de galletas por peso", () => {
  it("usa 110 gramos por defecto y prioriza el peso guardado", () => {
    expect(cookieUnitWeightLb()).toBeCloseTo(110 / 453.59237, 10);
    expect(cookieUnitWeightLb({ peso_lb: 0.5, peso_gramos: 110 })).toBe(0.5);
    expect(cookieUnitWeightLb({ peso_gramos: 220 })).toBeCloseTo(220 / 453.59237, 10);
  });
  it.each([[15,1200],[15.001,2500],[30,2500],[30.001,3999],[45,3999],[46,4079]])("%s lb cobra %s centavos", (weight, fee) => {
    expect(cookieWeightDelivery([{ qty: 1, unitWeightLb: weight }], DEFAULT_PRICING).deliveryCents).toBe(fee);
  });
  it("usa tarifas editables de la tabla compartida", () => {
    expect(cookieWeightDelivery([{ qty: 1, unitWeightLb: 50 }], { ...DEFAULT_PRICING, tierLargeFeeUsd: 40, weightExtraPerLbUsd: 1 }).deliveryCents).toBe(4500);
  });
  it("máximo inclusivo idéntico al Supermercado", () => {
    expect(cookieWeightDelivery([{ qty: 1, unitWeightLb: 120 }], DEFAULT_PRICING).overLimit).toBe(false);
    expect(cookieWeightDelivery([{ qty: 1, unitWeightLb: 120.001 }], DEFAULT_PRICING).overLimit).toBe(true);
  });
  it.each([6,9,12])("pack de %s suma todas sus galletas", count => {
    expect(cookiePackCount(`p${count}`)).toBe(count);
    expect(cookiePackCount(`custom-pack-${count}-123456`)).toBe(count);
    expect(cookieWeightDelivery([{ qty: 10, unitWeightLb: cookiePackCount(`p${count}`) * cookieUnitWeightLb() }], DEFAULT_PRICING).weightLb).toBeCloseTo(count * 10 * 110 / 453.59237);
  });
  it("136 galletas superan 30 lb y 20 galletas mantienen $12, con cargo actualizado", () => {
    const large = cookieWeightDelivery([{ qty: 136, unitWeightLb: cookieUnitWeightLb() }], DEFAULT_PRICING);
    const small = cookieWeightDelivery([{ qty: 20, unitWeightLb: cookieUnitWeightLb() }], DEFAULT_PRICING);
    expect(large.weightLb).toBeCloseTo(32.98, 2);
    expect(large.deliveryCents).toBe(3999);
    expect(small.weightLb).toBeCloseTo(4.85, 2);
    expect(small.deliveryCents).toBe(1200);
    expect(cardPaymentQuote(136 * 375 + large.deliveryCents)).toMatchObject({ feeCents: 1674, totalCents: 56673 });
    expect(cardPaymentQuote(20 * 375 + small.deliveryCents)).toMatchObject({ feeCents: 291, totalCents: 8991 });
  });
  it("mínimo de productos continúa siendo $12", () => {
    expect(() => assertCookieSubtotal(1199)).toThrow();
    expect(() => assertCookieSubtotal(1200)).not.toThrow();
  });
  it("no limita la cantidad independientemente del peso", () => {
    expect(cookieQuoteItemsSchema.parse([{ id: "c1", name: "Galleta", price: 3.75, qty: 136 }])[0]?.qty).toBe(136);
    expect(cookieWeightDelivery([{ qty: 136, unitWeightLb: cookieUnitWeightLb() }], DEFAULT_PRICING).overLimit).toBe(false);
  });
});