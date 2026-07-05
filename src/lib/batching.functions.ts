import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

type LatLng = { lat: number; lng: number };

type Waypoint = {
  location: { latLng: { latitude: number; longitude: number } };
};

type RoutesApiResponse = {
  routes?: Array<{
    distanceMeters?: number;
    duration?: string;
    polyline?: { encodedPolyline?: string };
    optimizedIntermediateWaypointIndex?: number[];
  }>;
  error?: { message?: string };
};

async function computeRoute(params: {
  origin: LatLng;
  destination: LatLng;
  intermediates: LatLng[];
  optimize: boolean;
}): Promise<{
  distanceMeters: number;
  durationSeconds: number;
  polyline: string | null;
  optimizedOrder: number[] | null;
} | null> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const connKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!lovableKey || !connKey) return null;

  const body = {
    origin: { location: { latLng: { latitude: params.origin.lat, longitude: params.origin.lng } } },
    destination: { location: { latLng: { latitude: params.destination.lat, longitude: params.destination.lng } } },
    intermediates: params.intermediates.map<Waypoint>((p) => ({
      location: { latLng: { latitude: p.lat, longitude: p.lng } },
    })),
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
    optimizeWaypointOrder: params.optimize,
  };

  try {
    const res = await fetch(`${GATEWAY_URL}/routes/directions/v2:computeRoutes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": connKey,
        "Content-Type": "application/json",
        "X-Goog-FieldMask":
          "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.optimizedIntermediateWaypointIndex",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as RoutesApiResponse;
    const route = json.routes?.[0];
    if (!route) return null;
    const durationSeconds = route.duration
      ? Number(String(route.duration).replace(/s$/, ""))
      : 0;
    return {
      distanceMeters: route.distanceMeters ?? 0,
      durationSeconds,
      polyline: route.polyline?.encodedPolyline ?? null,
      optimizedOrder: route.optimizedIntermediateWaypointIndex ?? null,
    };
  } catch {
    return null;
  }
}

// Haversine fallback (km)
function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ============================================================
// suggestBatch: sugiere pedidos cercanos para agrupar
// ============================================================
export const suggestBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string; radiusKm?: number }) => ({
    orderId: uuid.parse(d.orderId),
    radiusKm: d.radiusKm ?? 1.5,
  }))
  .handler(async ({ context, data }) => {
    const { supabase } = context;

    // 1) Pedido base
    const { data: base, error: baseErr } = await supabase
      .from("courier_orders")
      .select("id, pickup_lat, pickup_lng, pickup_address, estimated_earnings, estimated_duration_minutes")
      .eq("id", data.orderId)
      .maybeSingle();
    if (baseErr) throw new Error(baseErr.message);
    if (!base) throw new Error("Pedido no encontrado");

    // 2) Candidatos cercanos vía RPC
    const { data: nearby, error: rpcErr } = await supabase.rpc("nearby_batchable_orders", {
      _order_id: data.orderId,
      _radius_km: data.radiusKm,
    });
    if (rpcErr) throw new Error(rpcErr.message);

    const candidates = (nearby ?? []).slice(0, 4); // máx 4 extras + base = 5 pedidos
    if (candidates.length === 0) {
      return {
        base: {
          id: base.id,
          pickup_address: base.pickup_address,
          estimated_earnings: Number(base.estimated_earnings),
        },
        candidates: [],
        totalDistanceKm: 0,
        totalDurationMin: 0,
        estimatedEarnings: Number(base.estimated_earnings),
        polyline: null as string | null,
      };
    }

    // 3) Traer stops (destinos) de todos los pedidos involucrados
    const allIds = [base.id, ...candidates.map((c) => c.id as string)];
    const { data: stops, error: stopsErr } = await supabase
      .from("courier_order_stops")
      .select("order_id, sequence_number, delivery_lat, delivery_lng")
      .in("order_id", allIds)
      .order("sequence_number", { ascending: true });
    if (stopsErr) throw new Error(stopsErr.message);

    const dropoffsByOrder = new Map<string, LatLng[]>();
    for (const s of stops ?? []) {
      const list = dropoffsByOrder.get(s.order_id) ?? [];
      list.push({ lat: Number(s.delivery_lat), lng: Number(s.delivery_lng) });
      dropoffsByOrder.set(s.order_id, list);
    }

    // 4) Waypoints: origen = pickup base; intermedios = pickups extras + dropoffs base;
    //    destino = último dropoff. Optimizamos el orden intermedio.
    const origin: LatLng = { lat: Number(base.pickup_lat), lng: Number(base.pickup_lng) };
    const intermediates: LatLng[] = [];
    for (const c of candidates) {
      intermediates.push({ lat: Number(c.pickup_lat), lng: Number(c.pickup_lng) });
    }
    for (const id of allIds) {
      for (const d of dropoffsByOrder.get(id) ?? []) intermediates.push(d);
    }
    if (intermediates.length === 0) {
      return {
        base: {
          id: base.id,
          pickup_address: base.pickup_address,
          estimated_earnings: Number(base.estimated_earnings),
        },
        candidates: [],
        totalDistanceKm: 0,
        totalDurationMin: 0,
        estimatedEarnings: Number(base.estimated_earnings),
        polyline: null,
      };
    }
    const destination = intermediates[intermediates.length - 1];
    const middle = intermediates.slice(0, -1);

    // 5) Google Routes API
    const route = await computeRoute({
      origin,
      destination,
      intermediates: middle,
      optimize: true,
    });

    let totalDistanceKm: number;
    let totalDurationMin: number;
    let polyline: string | null = null;
    if (route) {
      totalDistanceKm = route.distanceMeters / 1000;
      totalDurationMin = Math.round(route.durationSeconds / 60);
      polyline = route.polyline;
    } else {
      // Fallback: suma haversine secuencial
      let d = 0;
      let prev = origin;
      for (const p of intermediates) {
        d += haversineKm(prev, p);
        prev = p;
      }
      totalDistanceKm = d;
      totalDurationMin = Math.max(1, Math.round((d / 25) * 60));
    }

    const estimatedEarnings =
      Number(base.estimated_earnings) +
      candidates.reduce((sum, c) => sum + Number(c.estimated_earnings ?? 0), 0);

    return {
      base: {
        id: base.id,
        pickup_address: base.pickup_address,
        estimated_earnings: Number(base.estimated_earnings),
      },
      candidates: candidates.map((c) => ({
        id: c.id as string,
        pickup_address: c.pickup_address as string,
        estimated_earnings: Number(c.estimated_earnings ?? 0),
        distance_km: Number(c.distance_km ?? 0),
        stops_count: Number(c.stops_count ?? 0),
      })),
      totalDistanceKm,
      totalDurationMin,
      estimatedEarnings,
      polyline,
      usedGoogle: !!route,
    };
  });

// ============================================================
// createBatch: agrupa pedidos y los asigna al driver actual
// ============================================================
export const createBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderIds: string[] }) => ({
    orderIds: z.array(uuid).min(2).max(5).parse(d.orderIds),
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    // Verificar que todos existen y están disponibles / o ya asignados a este driver
    const { data: rows, error } = await supabase
      .from("courier_orders")
      .select("id, status, driver_id, batch_id")
      .in("id", data.orderIds);
    if (error) throw new Error(error.message);
    if (!rows || rows.length !== data.orderIds.length) {
      throw new Error("Uno o más pedidos no existen");
    }
    for (const r of rows) {
      if (r.batch_id) throw new Error("Un pedido ya está agrupado en otro batch");
      const isAvailable = r.status === "disponible" && r.driver_id == null;
      const isMine =
        r.driver_id === userId && ["aceptado", "en_recoleccion"].includes(r.status);
      if (!isAvailable && !isMine) {
        throw new Error("Un pedido ya no puede agruparse");
      }
    }

    // Generar batch_id (uuid v4 en JS)
    const batchId = crypto.randomUUID();

    // Asignar batch + driver a cada pedido en el orden recibido
    for (let i = 0; i < data.orderIds.length; i++) {
      const id = data.orderIds[i];
      const { error: upErr } = await supabase
        .from("courier_orders")
        .update({
          batch_id: batchId,
          batch_position: i + 1,
          driver_id: userId,
          status: rows.find((r) => r.id === id)?.status === "disponible" ? "aceptado" : rows.find((r) => r.id === id)!.status,
          accepted_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (upErr) throw new Error(upErr.message);
    }

    return { batchId, count: data.orderIds.length };
  });

// ============================================================
// getOptimizedRoute: ruta optimizada para un pedido/batch en curso
// ============================================================
export const getOptimizedRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string; driverLat?: number; driverLng?: number }) => ({
    orderId: uuid.parse(d.orderId),
    driverLat: d.driverLat ?? null,
    driverLng: d.driverLng ?? null,
  }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: order, error } = await supabase
      .from("courier_orders")
      .select("id, driver_id, batch_id, pickup_lat, pickup_lng, status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Pedido no encontrado");
    if (order.driver_id !== userId) throw new Error("No autorizado");

    // Recolectar todos los pedidos del batch (o solo éste)
    const orderIds = order.batch_id
      ? (
          await supabase
            .from("courier_orders")
            .select("id, pickup_lat, pickup_lng, batch_position")
            .eq("batch_id", order.batch_id)
            .order("batch_position", { ascending: true })
        ).data ?? [order]
      : [order];

    const { data: stops } = await supabase
      .from("courier_order_stops")
      .select("id, order_id, sequence_number, delivery_lat, delivery_lng, status")
      .in("order_id", orderIds.map((o) => o.id))
      .order("sequence_number", { ascending: true });

    const pendingPickupOrders = orderIds.filter((o) => {
      const raw = (o as { status?: string }).status;
      return raw === "aceptado" || raw === "en_recoleccion" || raw === undefined;
    });
    const pendingDropoffs = (stops ?? []).filter(
      (s) => s.status !== "entregado" && s.status !== "fallido",
    );

    const origin: LatLng =
      data.driverLat != null && data.driverLng != null
        ? { lat: data.driverLat, lng: data.driverLng }
        : { lat: Number(order.pickup_lat), lng: Number(order.pickup_lng) };

    const waypoints: LatLng[] = [
      ...pendingPickupOrders.map((o) => ({ lat: Number(o.pickup_lat), lng: Number(o.pickup_lng) })),
      ...pendingDropoffs.map((s) => ({ lat: Number(s.delivery_lat), lng: Number(s.delivery_lng) })),
    ];

    if (waypoints.length === 0) {
      return { polyline: null as string | null, distanceKm: 0, durationMin: 0, usedGoogle: false };
    }

    const destination = waypoints[waypoints.length - 1];
    const middle = waypoints.slice(0, -1);

    const route = await computeRoute({
      origin,
      destination,
      intermediates: middle,
      optimize: false, // en ruta ya no reordenamos automáticamente
    });

    if (!route) {
      let d = 0;
      let prev = origin;
      for (const p of waypoints) {
        d += haversineKm(prev, p);
        prev = p;
      }
      return {
        polyline: null,
        distanceKm: d,
        durationMin: Math.max(1, Math.round((d / 25) * 60)),
        usedGoogle: false,
      };
    }

    return {
      polyline: route.polyline,
      distanceKm: route.distanceMeters / 1000,
      durationMin: Math.round(route.durationSeconds / 60),
      usedGoogle: true,
    };
  });
