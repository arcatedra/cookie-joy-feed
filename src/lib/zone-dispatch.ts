/**
 * Hazorex — Paso 2: Acumulación por zona/día + validación de peso en carrito
 * ---------------------------------------------------------------------
 * Requiere el esquema de zone_dispatch_accumulation.sql
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type DispatchDay = 'lunes' | 'viernes';

export interface ZoneDispatchSummary {
  zone_id: string;
  zone_name: string;
  delivery_day: DispatchDay;
  dispatch_date: string; // formato ISO (YYYY-MM-DD)
  total_orders: number;
  total_weight_kg: number;
}

const MAX_STANDARD_WEIGHT_KG = 20;

// =========================================================
// 1) Panel de administración — acumulación por zona/día
// =========================================================

/**
 * Calcula la próxima fecha (lunes o viernes) a partir de una fecha dada.
 * Útil en el front-end para mostrarle al cliente "tu pedido se despacha el ...",
 * pero la fuente de verdad real es el trigger de Supabase (next_dispatch_date en SQL),
 * que es el que efectivamente guarda dispatch_date en cada pedido.
 */
export function getNextDispatchDate(day: DispatchDay, from: Date = new Date()): Date {
  const targetDow = day === 'lunes' ? 1 : 5; // 0=domingo ... 6=sábado
  const currentDow = from.getDay();
  const daysAhead = (targetDow - currentDow + 7) % 7;
  const result = new Date(from);
  result.setDate(from.getDate() + daysAhead);
  return result;
}

/**
 * Trae el acumulado de pedidos y kilos por zona/día desde la vista de Supabase.
 * Ideal para pintar tarjetas o una tabla en el panel de admin, filtrable por
 * el próximo día de despacho o por un día específico.
 *
 * @example
 * const summary = await fetchZoneDispatchSummary(supabase, { deliveryDay: 'viernes' });
 */
export async function fetchZoneDispatchSummary(
  supabase: SupabaseClient,
  filters?: { dispatchDate?: string; deliveryDay?: DispatchDay }
): Promise<ZoneDispatchSummary[]> {
  let query = supabase.from('v_zone_dispatch_summary').select('*');

  if (filters?.dispatchDate) query = query.eq('dispatch_date', filters.dispatchDate);
  if (filters?.deliveryDay) query = query.eq('delivery_day', filters.deliveryDay);

  const { data, error } = await query.order('dispatch_date', { ascending: true });

  if (error) {
    throw new Error(`No se pudo obtener el acumulado por zona: ${error.message}`);
  }

  return (data ?? []) as ZoneDispatchSummary[];
}

/**
 * Registra un nuevo pedido de suscripción. dispatch_date se calcula solo,
 * automáticamente, dentro de la base de datos (trigger) — no hace falta
 * enviarlo desde el front-end.
 */
export async function createSubscriptionOrder(
  supabase: SupabaseClient,
  order: { customerId: string; zoneId: string; deliveryDay: DispatchDay; weightKg: number }
) {
  const { data, error } = await supabase
    .from('subscription_orders')
    .insert({
      customer_id: order.customerId,
      zone_id: order.zoneId,
      delivery_day: order.deliveryDay,
      weight_kg: order.weightKg,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`No se pudo registrar el pedido: ${error.message}`);
  }

  return data;
}

// =========================================================
// 2) Alerta de peso en el carrito (front-end)
// =========================================================

export interface CartWeightCheck {
  exceeded: boolean;
  currentWeightKg: number;
  overByKg: number;
  /** Mensaje modal exacto listo para mostrar; null si no se supera el límite. */
  message: string | null;
}

/** Formatea kg sin decimales si es un número entero, o con 1 decimal si no. */
function formatKg(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

/**
 * Valida el peso total del carrito contra el límite estándar (20 kg por defecto).
 * Si se supera, retorna el mensaje modal exacto que debe bloquear el pago.
 *
 * Úsalo justo antes de procesar el pago:
 *
 * @example
 * const check = checkCartWeight(cartTotalWeightKg);
 * if (check.exceeded) {
 *   showBlockingModal(check.message);
 *   return; // no continuar al pago
 * }
 */
export function checkCartWeight(
  currentWeightKg: number,
  maxWeightKg: number = MAX_STANDARD_WEIGHT_KG
): CartWeightCheck {
  if (currentWeightKg <= maxWeightKg) {
    return { exceeded: false, currentWeightKg, overByKg: 0, message: null };
  }

  const overByKg = currentWeightKg - maxWeightKg;

  const message =
    `📦 Límite de Peso Superado (Máx. ${maxWeightKg} kg)\n` +
    `Tu pedido actual pesa ${formatKg(currentWeightKg)} kg (te pasaste por ${formatKg(overByKg)} kg). ` +
    `Para continuar, elige una opción:\n` +
    `• Opción A: Quita el producto que te sobra (${formatKg(overByKg)} kg) para enviarlo bajo tu suscripción actual.\n` +
    `• Opción B: Deja el carrito como está y usa tu segunda entrega del mes para cubrir el peso extra.`;

  return { exceeded: true, currentWeightKg, overByKg, message };
}
