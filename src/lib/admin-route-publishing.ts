/**
 * Hazorex — Publicación de rutas (panel de administración)
 * ---------------------------------------------------------
 * Requiere el esquema de admin_route_publishing.sql
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DispatchDay } from './zone-dispatch';
import type { DeliveryRoute } from './driver-routes';

export interface PendingBatch {
  zone_id: string;
  zone_name: string;
  delivery_day: DispatchDay;
  dispatch_date: string; // ISO date
  total_orders: number;
  total_weight_kg: number;
}

/**
 * Trae los lotes de pedidos confirmados que AÚN no se han convertido en
 * una ruta publicada — esto es lo que el admin ve en su dashboard para
 * decidir qué publicar antes de cada lunes/viernes.
 */
export async function fetchPendingBatches(
  supabase: SupabaseClient,
  filters?: { deliveryDay?: DispatchDay; dispatchDate?: string }
): Promise<PendingBatch[]> {
  let query = supabase.from('v_pending_batch_summary').select('*');

  if (filters?.deliveryDay) query = query.eq('delivery_day', filters.deliveryDay);
  if (filters?.dispatchDate) query = query.eq('dispatch_date', filters.dispatchDate);

  const { data, error } = await query.order('dispatch_date', { ascending: true });

  if (error) throw new Error(`No se pudieron cargar los lotes pendientes: ${error.message}`);
  return (data ?? []) as PendingBatch[];
}

/**
 * Publica una ruta a partir de un lote específico (zona + fecha + día).
 * La función en Supabase valida que quien llama sea admin y que existan
 * pedidos pendientes; crea la ruta y todas sus paradas en una sola transacción.
 */
export async function publishRoute(
  supabase: SupabaseClient,
  params: {
    zoneId: string;
    dispatchDate: string;
    deliveryDay: DispatchDay;
    routeName: string;
    fixedPay: number;
  }
): Promise<DeliveryRoute> {
  const { data, error } = await supabase.rpc('publish_route', {
    p_zone_id: params.zoneId,
    p_dispatch_date: params.dispatchDate,
    p_delivery_day: params.deliveryDay,
    p_route_name: params.routeName,
    p_fixed_pay: params.fixedPay,
  });

  if (error) throw new Error(error.message);
  return data as DeliveryRoute;
}

/** Cambia el orden de visita de una parada antes (o después) de publicar. */
export async function reorderRouteStop(
  supabase: SupabaseClient,
  stopId: string,
  newSequence: number
): Promise<void> {
  const { error } = await supabase.rpc('reorder_route_stop', {
    p_stop_id: stopId,
    p_new_sequence: newSequence,
  });

  if (error) throw new Error(error.message);
}

/**
 * Sugerencia de nombre de ruta y pago fijo por defecto, para pre-llenar
 * el formulario del admin (el admin siempre puede editarlo antes de publicar).
 */
export function suggestRouteDefaults(batch: PendingBatch): { routeName: string; suggestedPay: number } {
  const dateLabel = new Date(batch.dispatch_date).toLocaleDateString('es-US', {
    day: '2-digit',
    month: 'short',
  });
  const routeName = `Ruta ${batch.zone_name} - ${batch.delivery_day} ${dateLabel}`;

  // Heurística simple: $4.50 por parada. Ajusta a tu margen real.
  const suggestedPay = Math.round(batch.total_orders * 4.5 * 100) / 100;

  return { routeName, suggestedPay };
}
