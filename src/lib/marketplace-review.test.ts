import { describe, expect, it } from "vitest";
import { DEFAULT_PRICING, serviceFeeCents, tierForWeight, weightFeeCents } from "./pricing";
import { environmentForStoreOrder, storeShareCents } from "./payouts.server";
import { NYC_BOROUGHS, zoneForPostalCode } from "./nyc-zones";

describe("revisión final del marketplace", () => {
  it("resuelve ZIP completo y deja códigos desconocidos fuera del catálogo", () => {
    const zones = [{ name: "Greenpoint", borough: "Brooklyn", zip_codes: ["11222", "11211"], activo: true }];
    expect(zoneForPostalCode(zones, "11222")?.name).toBe("Greenpoint");
    expect(zoneForPostalCode(zones, "112")).toBeUndefined();
    expect(zoneForPostalCode(zones, "99999")).toBeUndefined();
    expect(NYC_BOROUGHS).toHaveLength(5);
  });
  it("clasifica por peso, sin cargo de servicio y $0.80 por libra sobre 45 lb", () => {
    expect(serviceFeeCents(10000, DEFAULT_PRICING)).toBe(0);
    expect(tierForWeight(15, DEFAULT_PRICING).feeCents).toBe(1200);
    expect(tierForWeight(15.1, DEFAULT_PRICING).feeCents).toBe(2500);
    expect(tierForWeight(30, DEFAULT_PRICING).feeCents).toBe(2500);
    expect(tierForWeight(45, DEFAULT_PRICING).feeCents).toBe(3999);
    expect(weightFeeCents(45, DEFAULT_PRICING)).toBe(0);
    expect(weightFeeCents(50, DEFAULT_PRICING)).toBe(400);
  });
  it("la tienda recibe sus productos sin descontar comisión", () => {
    expect(storeShareCents({ monto_capturado: 100, costo_envio: 10, cargo_peso: 5, cargo_servicio: 18, propina: 7 })).toBe(6000);
  });
  it("usa el ambiente persistido del pedido y bloquea pedidos sin ambiente", async () => {
    const db = (stripe_environment: unknown) => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { stripe_environment }, error: null }) }) }) }) });
    await expect(environmentForStoreOrder("PRUEBA", db("sandbox"))).resolves.toBe("sandbox");
    await expect(environmentForStoreOrder("PRUEBA", db("live"))).resolves.toBe("live");
    await expect(environmentForStoreOrder("PRUEBA", db(null))).rejects.toThrow("no tiene ambiente Stripe verificado");
  });
});