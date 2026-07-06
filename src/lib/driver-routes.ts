/**
 * Hazorex — Paso 3: Panel Repartidor (rutas por bloque, tipo DashLink)
 * -------------------------------------------------------------------
 * Requiere el esquema con las funciones accept_route, scan_route_package,
 * start_route_transit y complete_route_stop.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type RouteStatus = 'disponible' | 'asignada' | 'en_transito' | 'completada' | 'cancelada';
export type StopStatus = 'pendiente' | 'en_camino' | 'entregado' | 'fallido';

export interface DeliveryRoute {
  id: string;
  route_name: string;
  zone_id: string;
  dispatch_date: string;
  delivery_day: 'lunes' | 'viernes';
  total_stops: number;
  fixed_pay: number;
  status: RouteStatus;
  driver_id: string | null;
  accepted_at: string | null;
  warehouse_checkin_at: string | null;
  completed_at: string | null;
}

export interface RouteStop {
  id: string;
  route_id: string;
  order_id: string;
  sequence_number: number;
  package_code: string;
  delivery_address: string;
  delivery_lat: number | null;
  delivery_lng: number | null;
  recipient_name: string;
  recipient_phone: string | null;
  delivery_instruction: string;
  status: StopStatus;
  scanned_at: string | null;
  delivery_photo_url: string | null;
  delivered_at: string | null;
}

// =========================================================
// 1) Publicación y aceptación de la ruta (bloque cerrado)
// =========================================================

export async function fetchAvailableRoutes(supabase: SupabaseClient): Promise<DeliveryRoute[]> {
  const { data, error } = await supabase
    .from('delivery_routes')
    .select('*')
    .eq('status', 'disponible')
    .order('dispatch_date', { ascending: true });

  if (error) throw new Error(`No se pudieron cargar las rutas disponibles: ${error.message}`);
  return (data ?? []) as DeliveryRoute[];
}

export async function acceptRoute(supabase: SupabaseClient, routeId: string): Promise<DeliveryRoute> {
  const { data, error } = await supabase.rpc('accept_route', { p_route_id: routeId });
  if (error) throw new Error(error.message);
  return data as DeliveryRoute;
}

export async function fetchMyActiveRoute(supabase: SupabaseClient): Promise<DeliveryRoute | null> {
  const { data, error } = await supabase
    .from('delivery_routes')
    .select('*')
    .in('status', ['asignada', 'en_transito'])
    .maybeSingle();

  if (error) throw new Error(`No se pudo obtener tu ruta activa: ${error.message}`);
  return (data as DeliveryRoute) ?? null;
}

// =========================================================
// 2) Recogida y escaneo en almacén
// =========================================================

export async function fetchRouteStops(supabase: SupabaseClient, routeId: string): Promise<RouteStop[]> {
  const { data, error } = await supabase
    .from('route_stops')
    .select('*')
    .eq('route_id', routeId)
    .order('sequence_number', { ascending: true });

  if (error) throw new Error(`No se pudieron cargar las paradas: ${error.message}`);
  return (data ?? []) as RouteStop[];
}

export async function scanPackage(
  supabase: SupabaseClient,
  routeId: string,
  packageCode: string
): Promise<RouteStop> {
  const { data, error } = await supabase.rpc('scan_route_package', {
    p_route_id: routeId,
    p_package_code: packageCode,
  });
  if (error) throw new Error(error.message);
  return data as RouteStop;
}

export function isFullyScanned(stops: RouteStop[]): boolean {
  return stops.length > 0 && stops.every((s) => s.scanned_at !== null);
}

export async function startRouteTransit(supabase: SupabaseClient, routeId: string): Promise<DeliveryRoute> {
  const { data, error } = await supabase.rpc('start_route_transit', { p_route_id: routeId });
  if (error) throw new Error(error.message);
  return data as DeliveryRoute;
}

// =========================================================
// 3) Navegación secuencial y entrega con evidencia fotográfica
// =========================================================

export function getCurrentStop(stops: RouteStop[]): RouteStop | null {
  const sorted = [...stops].sort((a, b) => a.sequence_number - b.sequence_number);
  return sorted.find((s) => s.status === 'pendiente' || s.status === 'en_camino') ?? null;
}

export function buildExternalMapsLinks(lat: number, lng: number) {
  return {
    googleMaps: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
    waze: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
    appleMaps: `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`,
  };
}

export async function confirmStopDelivery(
  supabase: SupabaseClient,
  stopId: string,
  photoFile: File
): Promise<RouteStop> {
  if (!photoFile) {
    throw new Error('Debes tomar una foto de evidencia para completar la entrega.');
  }

  const filePath = `delivery-proofs/${stopId}-${Date.now()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('delivery-proofs')
    .upload(filePath, photoFile, { contentType: photoFile.type || 'image/jpeg' });

  if (uploadError) {
    throw new Error(`No se pudo subir la foto de evidencia: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage.from('delivery-proofs').getPublicUrl(filePath);

  const { data, error } = await supabase.rpc('complete_route_stop', {
    p_stop_id: stopId,
    p_photo_url: publicUrlData.publicUrl,
  });

  if (error) throw new Error(error.message);
  return data as RouteStop;
}

export function getMandatoryDeliveryInstruction(stop: RouteStop): string {
  return stop.delivery_instruction || 'ENTREGA SOLO EN PLANTA BAJA / LOBBY';
}
