import { describe, expect, it } from "vitest";
import { cardPaymentQuote, paymentProcessingCents, assertProcessingQuote } from "./payment-processing.server";
import { DEFAULT_PRICING, tierForWeight, weightFeeCents } from "./pricing";
import { storeShareCents } from "./payouts.server";

describe("cargo por procesamiento de pago", () => {
  it("galletas: $27 base, $1.12 cargo, $28.12 tarjeta", () => {
    expect(cardPaymentQuote(2700)).toEqual({ baseCents: 2700, feeCents: 112, totalCents: 2812 });
  });
  it("supermercado: $80 base, $2.70 cargo, $82.70 tarjeta", () => {
    expect(cardPaymentQuote(8000)).toEqual({ baseCents: 8000, feeCents: 270, totalCents: 8270 });
  });
  it.each([[15, 1200, 0, 290], [30, 2500, 0, 329], [45, 3999, 0, 374], [50, 3999, 400, 386]])(
    "%s lb mantiene entrega y calcula cargo sobre productos, entrega y propina", (lb, delivery, extra, fee) => {
      expect(tierForWeight(lb, DEFAULT_PRICING).feeCents).toBe(delivery);
      expect(weightFeeCents(lb, DEFAULT_PRICING)).toBe(extra);
      expect(paymentProcessingCents(7000 + delivery + extra + 500)).toBe(fee);
    },
  );
  it("descuenta saldo antes de calcular cargo sin cambiar reglas de referidos", () => {
    expect(cardPaymentQuote(8000 - 500)).toEqual({ baseCents: 7500, feeCents: 255, totalCents: 7755 });
  });
  it("reserva especial incluye cargo antes de margen 15%", () => {
    const quote = cardPaymentQuote(8000);
    expect(quote.totalCents + Math.max(500, Math.round(quote.totalCents * .15))).toBe(9511);
  });
  it("faltante reduce cargo y total capturable", () => {
    expect(cardPaymentQuote(8000 - 2000)).toEqual({ baseCents: 6000, feeCents: 210, totalCents: 6210 });
  });
  it("sin pedido no cobra cargo", () => expect(cardPaymentQuote(0).totalCents).toBe(0));
  it("histórico sin versión no recibe cargo nuevo", () => expect(cardPaymentQuote(8000, null).totalCents).toBe(8000));
  it("productos de tienda y propina 100% no financian el cargo", () => {
    const original = { monto_capturado: 80, costo_envio: 12, propina: 5, credito_aplicado: 0 };
    expect(storeShareCents(original)).toBe(6300);
    expect(storeShareCents({ ...original, monto_capturado: 82.70, cargo_procesamiento: 2.70 })).toBe(6300);
  });
  it("rechaza presupuesto desactualizado", () => expect(() => assertProcessingQuote(112, 270)).toThrow(/total cambió/));
  it("rechaza importes inválidos", () => {
    for (const base of [-1, NaN, Infinity, 1.5]) expect(() => paymentProcessingCents(base)).toThrow();
  });
});