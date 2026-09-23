/**
 * Modelo de cobro por pedido del marketplace (sin suscripciones).
 * Valores editables en /admin/precios (tabla pricing_settings).
 */

export interface PricingSettings {
  serviceMinUsd: number;
  servicePct: number;
  weightIncludedLb: number;
  weightTier2MaxLb: number;
  weightTier2FeeUsd: number;
  weightTier3MaxLb: number;
  weightTier3FeeUsd: number;
  weightMaxLb: number;
  defaultProductWeightLb: number;
  driverPerStopUsd: number;
  driverPerItemUsd: number;
  driverItemThreshold: number;
  driverWeightSharePct: number;
  driverTipSharePct: number;
  referralBonusUsd: number;
  /** Tramos de envío por monto del pedido. */
  tierSmallMaxUsd: number;
  tierMediumMaxUsd: number;
  tierSmallFeeUsd: number;
  tierSmallDriverUsd: number;
  tierSmallCompanyUsd: number;
  tierMediumFeeUsd: number;
  tierMediumDriverUsd: number;
  tierMediumCompanyUsd: number;
  tierLargeFeeUsd: number;
  tierLargeDriverUsd: number;
  tierLargeCompanyUsd: number;
  /** Hora límite de corte (0-23, hora de Nueva York) del día anterior. */
  cutoffHourEt: number;
  /** Días de entrega permitidos como máscara de bits (domingo = 1, lunes = 2, ...). */
  deliveryDaysMask: number;
}

export const PRICING_KEYS: Record<keyof PricingSettings, string> = {
  serviceMinUsd: "service_min_usd",
  servicePct: "service_pct",
  weightIncludedLb: "weight_included_lb",
  weightTier2MaxLb: "weight_tier2_max_lb",
  weightTier2FeeUsd: "weight_tier2_fee_usd",
  weightTier3MaxLb: "weight_tier3_max_lb",
  weightTier3FeeUsd: "weight_tier3_fee_usd",
  weightMaxLb: "weight_max_lb",
  defaultProductWeightLb: "default_product_weight_lb",
  driverPerStopUsd: "driver_per_stop_usd",
  driverPerItemUsd: "driver_per_item_usd",
  driverItemThreshold: "driver_item_threshold",
  driverWeightSharePct: "driver_weight_share_pct",
  driverTipSharePct: "driver_tip_share_pct",
  referralBonusUsd: "referral_bonus_usd",
};

export const DEFAULT_PRICING: PricingSettings = {
  serviceMinUsd: 15,
  servicePct: 18,
  weightIncludedLb: 45,
  weightTier2MaxLb: 80,
  weightTier2FeeUsd: 5,
  weightTier3MaxLb: 120,
  weightTier3FeeUsd: 9,
  weightMaxLb: 120,
  defaultProductWeightLb: 1,
  driverPerStopUsd: 5.5,
  driverPerItemUsd: 0.1,
  driverItemThreshold: 30,
  driverWeightSharePct: 60,
  driverTipSharePct: 100,
  referralBonusUsd: 5,
};

/** Convierte las filas key/value de la base en un objeto de ajustes. */
export function pricingFromRows(
  rows: Array<{ key: string; value: number | string }> | null | undefined,
): PricingSettings {
  const map = new Map((rows ?? []).map((r) => [r.key, Number(r.value)]));
  const out = { ...DEFAULT_PRICING };
  for (const [field, key] of Object.entries(PRICING_KEYS) as [keyof PricingSettings, string][]) {
    const v = map.get(key);
    if (v != null && Number.isFinite(v)) out[field] = v;
  }
  return out;
}

/** Cargo de servicio: el mayor entre el mínimo y el porcentaje del pedido. */
export function serviceFeeCents(subtotalCents: number, p: PricingSettings): number {
  const pct = Math.round((subtotalCents * p.servicePct) / 100);
  return Math.max(Math.round(p.serviceMinUsd * 100), pct);
}

/** Cargo extra por peso según los tramos configurados. */
export function weightFeeCents(totalLb: number, p: PricingSettings): number {
  if (totalLb <= p.weightIncludedLb) return 0;
  if (totalLb <= p.weightTier2MaxLb) return Math.round(p.weightTier2FeeUsd * 100);
  if (totalLb <= p.weightTier3MaxLb) return Math.round(p.weightTier3FeeUsd * 100);
  return Math.round(p.weightTier3FeeUsd * 100);
}

export interface WeightStatus {
  totalLb: number;
  includedLb: number;
  overLimit: boolean;
  feeCents: number;
  pctOfIncluded: number;
}

export function weightStatus(totalLb: number, p: PricingSettings): WeightStatus {
  const overLimit = totalLb > p.weightMaxLb;
  return {
    totalLb,
    includedLb: p.weightIncludedLb,
    overLimit,
    feeCents: overLimit ? 0 : weightFeeCents(totalLb, p),
    pctOfIncluded: Math.min(100, Math.round((totalLb / Math.max(p.weightIncludedLb, 1)) * 100)),
  };
}

/** Pago al repartidor por una parada. */
export function driverPayUsd(
  input: { itemCount: number; weightFeeUsd: number; tipUsd: number },
  p: PricingSettings,
): number {
  const extraItems = Math.max(0, input.itemCount - p.driverItemThreshold);
  const base = p.driverPerStopUsd + extraItems * p.driverPerItemUsd;
  const weightShare = (input.weightFeeUsd * p.driverWeightSharePct) / 100;
  const tipShare = (input.tipUsd * p.driverTipSharePct) / 100;
  return Math.round((base + weightShare + tipShare) * 100) / 100;
}

/** Peso total del carrito en libras. */
export function cartWeightLb(
  items: Array<{ pesoLb?: number | null; qty: number }>,
  p: PricingSettings,
): number {
  const lb = items.reduce(
    (s, i) => s + (Number(i.pesoLb ?? p.defaultProductWeightLb) || p.defaultProductWeightLb) * i.qty,
    0,
  );
  return Math.round(lb * 100) / 100;
}

/** Día de la semana (0=domingo) → próximas fechas disponibles. */
export function nextDatesForDays(days: number[], count = 4, from: Date = new Date()): string[] {
  const out: string[] = [];
  const cursor = new Date(from);
  cursor.setHours(12, 0, 0, 0);
  for (let i = 1; i <= 21 && out.length < count; i++) {
    const d = new Date(cursor);
    d.setDate(cursor.getDate() + i);
    if (days.includes(d.getDay())) out.push(d.toISOString().slice(0, 10));
  }
  return out;
}
