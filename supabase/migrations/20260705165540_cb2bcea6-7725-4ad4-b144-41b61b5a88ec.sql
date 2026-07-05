
CREATE INDEX IF NOT EXISTS idx_courier_orders_status_batch_pickup
  ON public.courier_orders (status, batch_id)
  WHERE status IN ('disponible','aceptado');

CREATE INDEX IF NOT EXISTS idx_courier_orders_pickup_coords
  ON public.courier_orders (pickup_lat, pickup_lng);

CREATE OR REPLACE FUNCTION public.nearby_batchable_orders(
  _order_id uuid,
  _radius_km numeric DEFAULT 1.5
)
RETURNS TABLE (
  id uuid,
  pickup_address text,
  pickup_lat numeric,
  pickup_lng numeric,
  estimated_earnings numeric,
  estimated_duration_minutes integer,
  distance_km numeric,
  stops_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH origin AS (
    SELECT pickup_lat AS lat, pickup_lng AS lng
    FROM public.courier_orders
    WHERE id = _order_id
  )
  SELECT
    co.id,
    co.pickup_address,
    co.pickup_lat,
    co.pickup_lng,
    co.estimated_earnings,
    co.estimated_duration_minutes,
    -- Haversine (km), 6371 = radio de la tierra
    (2 * 6371 * asin(sqrt(
      power(sin(radians(co.pickup_lat - o.lat) / 2), 2) +
      cos(radians(o.lat)) * cos(radians(co.pickup_lat)) *
      power(sin(radians(co.pickup_lng - o.lng) / 2), 2)
    )))::numeric AS distance_km,
    (SELECT count(*)::integer FROM public.courier_order_stops s WHERE s.order_id = co.id) AS stops_count
  FROM public.courier_orders co, origin o
  WHERE co.id <> _order_id
    AND co.status = 'disponible'
    AND co.batch_id IS NULL
    AND co.pickup_lat IS NOT NULL
    AND co.pickup_lng IS NOT NULL
    AND (2 * 6371 * asin(sqrt(
      power(sin(radians(co.pickup_lat - o.lat) / 2), 2) +
      cos(radians(o.lat)) * cos(radians(co.pickup_lat)) *
      power(sin(radians(co.pickup_lng - o.lng) / 2), 2)
    ))) <= _radius_km
  ORDER BY distance_km ASC
  LIMIT 20;
$$;

GRANT EXECUTE ON FUNCTION public.nearby_batchable_orders(uuid, numeric) TO authenticated;
