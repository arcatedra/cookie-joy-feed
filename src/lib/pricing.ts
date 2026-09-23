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
  /** Precio por libra adicional sobre las libras incluidas (100% al repartidor). */
  weightExtraPerLbUsd: number;
  /** Cada cuántos días se transfiere su parte a los negocios. */
  payoutFrequencyDays: number;
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
  tierSmallMaxUsd: "tier_small_max_usd",
  tierMediumMaxUsd: "tier_medium_max_usd",
  tierSmallFeeUsd: "tier_small_fee_usd",
  tierSmallDriverUsd: "tier_small_driver_usd",
  tierSmallCompanyUsd: "tier_small_company_usd",
  tierMediumFeeUsd: "tier_medium_fee_usd",
  tierMediumDriverUsd: "tier_medium_driver_usd",
  tierMediumCompanyUsd: "tier_medium_company_usd",
  tierLargeFeeUsd: "tier_large_fee_usd",
  tierLargeDriverUsd: "tier_large_driver_usd",
  tierLargeCompanyUsd: "tier_large_company_usd",
  cutoffHourEt: "cutoff_hour_et",
  deliveryDaysMask: "delivery_days_mask",
  weightExtraPerLbUsd: "weight_extra_per_lb_usd",
  payoutFrequencyDays: "payout_frequency_days",
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
  driverWeightSharePct: 100,
  driverTipSharePct: 100,
  referralBonusUsd: 5,
  tierSmallMaxUsd: 50,
  tierMediumMaxUsd: 120,
  tierSmallFeeUsd: 12,
  tierSmallDriverUsd: 6,
  tierSmallCompanyUsd: 6,
  tierMediumFeeUsd: 18,
  tierMediumDriverUsd: 6,
  tierMediumCompanyUsd: 12,
  tierLargeFeeUsd: 35,
  tierLargeDriverUsd: 10,
  tierLargeCompanyUsd: 25,
  cutoffHourEt: 20,
  // lunes (2) + miércoles (8) + viernes (32)
  deliveryDaysMask: 42,
  weightExtraPerLbUsd: 0.7,
  payoutFrequencyDays: 1,
};

export type OrderTier = "chico" | "mediano" | "grande";

export interface TierFee {
  tier: OrderTier;
  feeCents: number;
  driverCents: number;
  companyCents: number;
}

/** Clasifica el pedido por su subtotal y devuelve el cobro de entrega. */
export function tierForSubtotal(subtotalCents: number, p: PricingSettings): TierFee {
  const usd = subtotalCents / 100;
  const c = (v: number) => Math.round(v * 100);
  if (usd <= p.tierSmallMaxUsd) {
    return {
      tier: "chico",
      feeCents: c(p.tierSmallFeeUsd),
      driverCents: c(p.tierSmallDriverUsd),
      companyCents: c(p.tierSmallCompanyUsd),
    };
  }
  if (usd <= p.tierMediumMaxUsd) {
    return {
      tier: "mediano",
      feeCents: c(p.tierMediumFeeUsd),
      driverCents: c(p.tierMediumDriverUsd),
      companyCents: c(p.tierMediumCompanyUsd),
    };
  }
  return {
    tier: "grande",
    feeCents: c(p.tierLargeFeeUsd),
    driverCents: c(p.tierLargeDriverUsd),
    companyCents: c(p.tierLargeCompanyUsd),
  };
}

/** Días de la semana permitidos (0 = domingo) según la máscara configurada. */
export function allowedDeliveryDays(p: PricingSettings): number[] {
  const mask = Number.isFinite(p.deliveryDaysMask) ? p.deliveryDaysMask : 42;
  const days: number[] = [];
  for (let d = 0; d <= 6; d++) if (mask & (1 << d)) days.push(d);
  return days.length > 0 ? days : [1, 3, 5];
}

/** Fecha (YYYY-MM-DD) y hora actuales en Nueva York. */
export function nowInEasternTime(from: Date = new Date()): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(from);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")) % 24,
  };
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function weekdayOf(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00Z`).getUTCDay();
}

/**
 * Próximas fechas de entrega: solo los días permitidos y respetando la hora
 * límite de corte del día anterior (hora de Nueva York).
 */
export function availableDeliveryDates(
  p: PricingSettings,
  count = 4,
  from: Date = new Date(),
): string[] {
  const days = allowedDeliveryDays(p);
  const { date, hour } = nowInEasternTime(from);
  // Si ya pasó la hora de corte, mañana deja de estar disponible.
  const firstOffset = hour >= p.cutoffHourEt ? 2 : 1;
  const out: string[] = [];
  for (let i = firstOffset; i <= firstOffset + 21 && out.length < count; i++) {
    const d = addDays(date, i);
    if (days.includes(weekdayOf(d))) out.push(d);
  }
  return out;
}

/** ¿La fecha elegida sigue siendo válida en este momento? */
export function isDeliveryDateAllowed(
  dateStr: string,
  p: PricingSettings,
  from: Date = new Date(),
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  if (!allowedDeliveryDays(p).includes(weekdayOf(dateStr))) return false;
  const { date, hour } = nowInEasternTime(from);
  const earliest = addDays(date, hour >= p.cutoffHourEt ? 2 : 1);
  return dateStr >= earliest;
}

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
/**
 * Cargo extra por peso: precio configurable por cada libra sobre las libras
 * incluidas. Va 100% al repartidor.
 */
export function weightFeeCents(totalLb: number, p: PricingSettings): number {
  const extra = Math.max(0, totalLb - p.weightIncludedLb);
  return Math.round(extra * p.weightExtraPerLbUsd * 100);
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
