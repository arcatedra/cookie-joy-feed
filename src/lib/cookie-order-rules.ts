export const COOKIE_MINIMUM_CENTS = 1200;

export function assertCookieMinimum(subtotalCents: number) {
  if (!Number.isInteger(subtotalCents) || subtotalCents < COOKIE_MINIMUM_CENTS) {
    const missing = Math.max(0, COOKIE_MINIMUM_CENTS - subtotalCents);
    throw new Error(`Pedido mínimo $12 — te faltan $${(missing / 100).toFixed(2)}`);
  }
}

export function stopCompensation(weightLb: number, tipUsd = 0, cookie = false) {
  if (!Number.isFinite(weightLb) || weightLb < 0 || !Number.isFinite(tipUsd) || tipUsd < 0) throw new Error("Peso o propina inválidos");
  const baseCents = cookie || weightLb <= 15 ? 500 : weightLb <= 30 ? 550 : 600;
  const extraLb = cookie ? 0 : Math.max(0, weightLb - 45);
  const customerWeightCents = Math.round(extraLb * 70);
  const driverWeightCents = Math.min(500, Math.round(extraLb * 25));
  const tipCents = Math.round(tipUsd * 100);
  return { baseCents, customerWeightCents, driverWeightCents, tipCents, totalCents: baseCents + driverWeightCents + tipCents };
}

export function vehicleOrderLimit(vehicle: string) {
  if (["bicycle", "bike", "bicicleta", "ebike", "e-bike", "motorcycle", "moto", "scooter"].includes(vehicle.toLowerCase())) return 3;
  if (["car", "auto", "automovil", "coche"].includes(vehicle.toLowerCase())) return 6;
  if (["van", "furgoneta"].includes(vehicle.toLowerCase())) return 10;
  return 3;
}