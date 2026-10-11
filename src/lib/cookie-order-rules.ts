/** Sin mínimo de compra: cada pedido de galletas paga una "Entrega y servicio" fija. */
export const DEFAULT_COOKIE_DELIVERY_CENTS = 1200;

export function cookieDeliveryFeeCents(settings?: { cookieDeliveryFeeUsd?: number } | null): number {
  const usd = Number(settings?.cookieDeliveryFeeUsd);
  if (!Number.isFinite(usd) || usd < 0 || usd > 100) return DEFAULT_COOKIE_DELIVERY_CENTS;
  return Math.round(usd * 100);
}

export function assertCookieSubtotal(subtotalCents: number) {
  if (!Number.isInteger(subtotalCents) || subtotalCents <= 0) throw new Error("Tu carrito está vacío.");
}

/** Propina extra después de la entrega: entre $1 y $100, hasta 24 horas después. */
export const POST_TIP_WINDOW_MS = 24 * 60 * 60 * 1000;
export function assertPostTipAllowed(amountUsd: number, deliveredAt: string | Date | null | undefined, now = Date.now()) {
  if (!Number.isFinite(amountUsd) || amountUsd < 1 || amountUsd > 100) throw new Error("La propina debe ser entre $1 y $100.");
  if (Math.round(amountUsd * 100) !== amountUsd * 100) throw new Error("Monto de propina inválido.");
  const t = deliveredAt ? new Date(deliveredAt).getTime() : NaN;
  if (!Number.isFinite(t)) throw new Error("El pedido todavía no está entregado.");
  if (now - t > POST_TIP_WINDOW_MS) throw new Error("Ya pasaron 24 horas desde la entrega.");
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