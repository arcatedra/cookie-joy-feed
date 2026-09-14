CREATE OR REPLACE FUNCTION public.delay_route_stops(p_minutes integer)
RETURNS TABLE(order_id uuid, cliente_id uuid, new_eta timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_route_id uuid;
BEGIN
  IF p_minutes NOT IN (15, 30, 60) THEN
    RAISE EXCEPTION 'Retraso no permitido';
  END IF;

  SELECT r.id INTO v_route_id
  FROM public.delivery_routes r
  WHERE r.driver_id = auth.uid()
    AND r.status IN ('asignada'::route_status, 'en_transito'::route_status)
  ORDER BY r.dispatch_date DESC
  LIMIT 1;

  IF v_route_id IS NULL THEN
    RAISE EXCEPTION 'No tienes una ruta activa';
  END IF;

  RETURN QUERY
  WITH upd AS (
    UPDATE public.route_stops s
    SET eta = COALESCE(s.eta, now()) + make_interval(mins => p_minutes),
        updated_at = now()
    WHERE s.route_id = v_route_id
      AND s.status IN ('pendiente'::stop_status, 'en_camino'::stop_status)
    RETURNING s.order_id, s.eta
  )
  SELECT upd.order_id, p.cliente_id, upd.eta
  FROM upd
  JOIN public.pedidos p ON p.id = upd.order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delay_route_stops(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delay_route_stops(integer) TO authenticated;