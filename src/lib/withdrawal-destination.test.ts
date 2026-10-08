import { describe, expect, it } from "vitest";
import { withdrawalRequestSchema } from "./withdrawal-destination";

describe("destino del retiro", () => {
  it.each([
    ["zelle", " persona@example.com ", "persona@example.com"],
    ["zelle", "(212) 555-0123", "+12125550123"],
    ["cash_app", "+1 212 555 0123", "+12125550123"],
    ["cash_app", "$PruebaHazorex", "$PruebaHazorex"],
    ["cash_app", "persona@example.com", "persona@example.com"],
  ])("normaliza %s %s", (payoutMethod, payoutIdentifier, normalized) => {
    expect(withdrawalRequestSchema.parse({ amount: 5, payoutMethod, payoutIdentifier }).payoutIdentifier).toBe(normalized);
  });
  it.each([
    ["zelle", "$Prueba"], ["cash_app", "123456789"], ["cash_app", "1234567890123456"],
    ["cash_app", "<script>alert(1)</script>"], ["cash_app", "$12345"],
    ["bank", "persona@example.com"], ["zelle", ""], ["zelle", "a".repeat(255)],
  ])("rechaza %s %s", (payoutMethod, payoutIdentifier) => {
    expect(withdrawalRequestSchema.safeParse({ amount: 5, payoutMethod, payoutIdentifier }).success).toBe(false);
  });
  it.each([0, -5, 1.001, Infinity, NaN, 100001])("rechaza importe inválido %s", (amount) => {
    expect(withdrawalRequestSchema.safeParse({ amount, payoutMethod: "zelle", payoutIdentifier: "persona@example.com" }).success).toBe(false);
  });
});