import { describe, expect, it } from "vitest";
import { spendableOrderCreditCents } from "./referral-credit";
import { storeShareCents } from "./payouts.server";
import es from "@/locales/es/translation.json";
import en from "@/locales/en/translation.json";

describe("saldo y propina", () => {
  it("preserva fondos de tienda y repartidor y deja al menos un dólar de cobro", () => {
    expect(spendableOrderCreditCents(50000, 10000, 1800)).toBe(1800);
    expect(spendableOrderCreditCents(500, 10000, 1800)).toBe(500);
    expect(spendableOrderCreditCents(500, 500, 500)).toBe(400);
    expect(spendableOrderCreditCents(-500, 5000, 1800)).toBe(0);
  });
  it("mantiene el 100% de productos con saldo aplicado y excluye la propina", () => {
    expect(storeShareCents({ monto_capturado: 95, credito_aplicado: 5, costo_envio: 10, cargo_peso: 5, cargo_servicio: 18, propina: 7 })).toBe(6000);
  });
  it("muestra exactamente las frases de entrega y sin propina en ambos idiomas", () => {
    expect(es.deliveryPromise).toBe("Pide el día antes y recibe en 24 horas: lunes, miércoles y viernes");
    expect(en.deliveryPromise).toBe("Order the day before, get it in 24 hours: Monday, Wednesday and Friday");
    expect(es.tips.none).toBe("Sin propina");
    expect(en.tips.none).toBe("No tip");
  });
});