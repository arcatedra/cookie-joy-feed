/**
 * Hazorex — Cálculo de tarifa de delivery (modelo DashLink)
 * -------------------------------------------------------
 * Reglas de negocio:
 * 1) Tarifa base por distancia: $base_fee para 0–base_distance_miles millas,
 *    + extra_fee_per_mile por cada milla adicional.
 * 2) Filtro de seguridad por peso: si el peso total supera
 *    max_standard_weight_kg, se suma heavy_handling_fee.
 *
 * Los valores numéricos NO están hardcodeados: se leen desde la tabla
 * `delivery_pricing_config` en Supabase.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface DeliveryPricingConfig {
  base_distance_miles: number;
  base_fee: number;
  extra_fee_per_mile: number;
  max_standard_weight_kg: number;
  heavy_handling_fee: number;
}

/**
 * Calcula el costo final del delivery a partir de la distancia y el peso.
 * Función pura, ideal para testear de forma aislada.
 *
 * @param distanceMiles Distancia de entrega en millas (>= 0)
 * @param weightKg Peso total del carrito en kg (>= 0)
 * @param config Parámetros de tarifas vigentes
 * @returns Costo final del delivery, redondeado a 2 decimales
 */
export function calculateDeliveryFee(
  distanceMiles: number,
  weightKg: number,
  config: DeliveryPricingConfig,
): number {
  if (!Number.isFinite(distanceMiles) || distanceMiles < 0) {
    throw new Error('La distancia de entrega debe ser un número mayor o igual a 0.');
  }
  if (!Number.isFinite(weightKg) || weightKg < 0) {
    throw new Error('El peso total del carrito debe ser un número mayor o igual a 0.');
  }

  const {
    base_distance_miles,
    base_fee,
    extra_fee_per_mile,
    max_standard_weight_kg,
    heavy_handling_fee,
  } = config;

  const extraMiles = Math.max(0, distanceMiles - base_distance_miles);
  const distanceFee = base_fee + extraMiles * extra_fee_per_mile;
  const heavyHandlingCharge = weightKg > max_standard_weight_kg ? heavy_handling_fee : 0;
  const totalFee = distanceFee + heavyHandlingCharge;

  return Math.round(totalFee * 100) / 100;
}

/**
 * Obtiene la configuración vigente de tarifas desde Supabase.
 */
export async function fetchDeliveryPricingConfig(
  supabase: SupabaseClient,
): Promise<DeliveryPricingConfig> {
  const { data, error } = await supabase
    .from('delivery_pricing_config')
    .select(
      'base_distance_miles, base_fee, extra_fee_per_mile, max_standard_weight_kg, heavy_handling_fee',
    )
    .eq('id', 'default')
    .single();

  if (error || !data) {
    throw new Error(
      `No se pudo obtener la configuración de tarifas de delivery: ${error?.message ?? 'sin datos'}`,
    );
  }

  return {
    base_distance_miles: Number(data.base_distance_miles),
    base_fee: Number(data.base_fee),
    extra_fee_per_mile: Number(data.extra_fee_per_mile),
    max_standard_weight_kg: Number(data.max_standard_weight_kg),
    heavy_handling_fee: Number(data.heavy_handling_fee),
  };
}

/**
 * Función de conveniencia: obtiene la config y calcula el costo en un paso.
 */
export async function getDeliveryFee(
  supabase: SupabaseClient,
  distanceMiles: number,
  weightKg: number,
): Promise<number> {
  const config = await fetchDeliveryPricingConfig(supabase);
  return calculateDeliveryFee(distanceMiles, weightKg, config);
}
