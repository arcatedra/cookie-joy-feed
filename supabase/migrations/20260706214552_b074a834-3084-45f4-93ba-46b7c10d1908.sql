
-- Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'route_status') THEN
    CREATE TYPE public.route_status AS ENUM ('disponible', 'asignada', 'en_transito', 'completada', 'cancelada');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stop_status') THEN
    CREATE TYPE public.stop_status AS ENUM ('pendiente', 'en_camino', 'entregado', 'fallido');
  END IF;
END$$;

-- delivery_routes
CREATE TABLE IF NOT EXISTS public.delivery_routes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_name            text NOT NULL,
  zone_id               text NOT NULL REFERENCES public.delivery_zones(id),
  dispatch_date         date NOT NULL,
  delivery_day          public.dispatch_day NOT NULL,
  total_stops           int NOT NULL CHECK (total_stops > 0),
  fixed_pay             numeric(10,2) NOT NULL CHECK (fixed_pay >= 0),
  status                public.route_status NOT NULL DEFAULT 'disponible',
  driver_id             uuid REFERENCES public.drivers(id),
  accepted_at           timestamptz,
  warehouse_checkin_at  timestamptz,
  completed_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_status ON public.delivery_routes (status, dispatch_date);

GRANT SELECT ON public.delivery_routes TO authenticated;
GRANT ALL ON public.delivery_routes TO service_role;

ALTER TABLE public.delivery_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delivery_routes_select"
ON public.delivery_routes FOR SELECT
TO authenticated
USING (
  status = 'disponible'
  OR driver_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "delivery_routes_admin_manage"
ON public.delivery_routes FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- route_stops
CREATE TABLE IF NOT EXISTS public.route_stops (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id             uuid NOT NULL REFERENCES public.delivery_routes(id) ON DELETE CASCADE,
  order_id             uuid NOT NULL REFERENCES public.subscription_orders(id),
  sequence_number      int NOT NULL,
  package_code         text NOT NULL,
  delivery_address     text NOT NULL,
  delivery_lat         numeric(10,6),
  delivery_lng         numeric(10,6),
  recipient_name       text NOT NULL,
  recipient_phone      text,
  delivery_instruction text NOT NULL DEFAULT 'ENTREGA SOLO EN PLANTA BAJA / LOBBY',
  status               public.stop_status NOT NULL DEFAULT 'pendiente',
  scanned_at           timestamptz,
  delivery_photo_url   text,
  failure_reason       text,
  delivered_at         timestamptz,
  UNIQUE (route_id, sequence_number),
  UNIQUE (route_id, order_id)
);
CREATE INDEX IF NOT EXISTS idx_route_stops_route_sequence ON public.route_stops (route_id, sequence_number);

GRANT SELECT ON public.route_stops TO authenticated;
GRANT ALL ON public.route_stops TO service_role;

ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "route_stops_select_own_route"
ON public.route_stops FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.delivery_routes r
    WHERE r.id = route_stops.route_id
      AND (r.driver_id = auth.uid() OR r.status = 'disponible')
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "route_stops_admin_manage"
ON public.route_stops FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- notification_queue
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type          text NOT NULL,
  route_stop_id uuid REFERENCES public.route_stops(id),
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.notification_queue TO service_role;

ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_queue_admin_only"
ON public.notification_queue FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Functions
CREATE OR REPLACE FUNCTION public.accept_route(p_route_id uuid)
RETURNS public.delivery_routes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id uuid := auth.uid();
  v_route public.delivery_routes;
  v_driver_ok boolean;
BEGIN
  SELECT (application_status = 'aprobado') INTO v_driver_ok
  FROM public.drivers WHERE id = v_driver_id;

  IF v_driver_ok IS NOT TRUE THEN
    RAISE EXCEPTION 'Solo repartidores aprobados pueden aceptar rutas';
  END IF;

  UPDATE public.delivery_routes
     SET status = 'asignada', driver_id = v_driver_id, accepted_at = now()
   WHERE id = p_route_id AND status = 'disponible' AND driver_id IS NULL
  RETURNING * INTO v_route;

  IF v_route.id IS NULL THEN
    RAISE EXCEPTION 'La ruta ya no está disponible';
  END IF;
  RETURN v_route;
END;
$$;

CREATE OR REPLACE FUNCTION public.scan_route_package(p_route_id uuid, p_package_code text)
RETURNS public.route_stops
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id uuid := auth.uid();
  v_stop public.route_stops;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.delivery_routes
    WHERE id = p_route_id AND driver_id = v_driver_id
  ) THEN
    RAISE EXCEPTION 'No tienes esta ruta asignada';
  END IF;

  UPDATE public.route_stops
     SET scanned_at = now()
   WHERE route_id = p_route_id AND package_code = p_package_code AND scanned_at IS NULL
  RETURNING * INTO v_stop;

  IF v_stop.id IS NULL THEN
    RAISE EXCEPTION 'Código de paquete no encontrado o ya escaneado';
  END IF;
  RETURN v_stop;
END;
$$;

CREATE OR REPLACE FUNCTION public.start_route_transit(p_route_id uuid)
RETURNS public.delivery_routes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id uuid := auth.uid();
  v_total int;
  v_scanned int;
  v_route public.delivery_routes;
BEGIN
  SELECT total_stops INTO v_total
  FROM public.delivery_routes
  WHERE id = p_route_id AND driver_id = v_driver_id AND status = 'asignada';

  IF v_total IS NULL THEN
    RAISE EXCEPTION 'Ruta no encontrada o no asignada a este conductor';
  END IF;

  SELECT count(*) INTO v_scanned
  FROM public.route_stops
  WHERE route_id = p_route_id AND scanned_at IS NOT NULL;

  IF v_scanned < v_total THEN
    RAISE EXCEPTION 'Faltan % paquete(s) por escanear', (v_total - v_scanned);
  END IF;

  UPDATE public.delivery_routes
     SET status = 'en_transito', warehouse_checkin_at = now()
   WHERE id = p_route_id
  RETURNING * INTO v_route;

  RETURN v_route;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_route_stop(p_stop_id uuid, p_photo_url text)
RETURNS public.route_stops
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id uuid := auth.uid();
  v_stop public.route_stops;
  v_route_id uuid;
  v_remaining int;
BEGIN
  IF p_photo_url IS NULL OR length(trim(p_photo_url)) = 0 THEN
    RAISE EXCEPTION 'La foto de evidencia es obligatoria para completar la entrega';
  END IF;

  SELECT rs.route_id INTO v_route_id
  FROM public.route_stops rs
  JOIN public.delivery_routes r ON r.id = rs.route_id
  WHERE rs.id = p_stop_id AND r.driver_id = v_driver_id AND r.status = 'en_transito';

  IF v_route_id IS NULL THEN
    RAISE EXCEPTION 'Parada no encontrada o ruta no está en tránsito';
  END IF;

  UPDATE public.route_stops
     SET status = 'entregado', delivery_photo_url = p_photo_url, delivered_at = now()
   WHERE id = p_stop_id
  RETURNING * INTO v_stop;

  INSERT INTO public.notification_queue (type, route_stop_id, payload)
  VALUES (
    'delivery_completed',
    v_stop.id,
    jsonb_build_object('order_id', v_stop.order_id, 'photo_url', v_stop.delivery_photo_url)
  );

  SELECT count(*) INTO v_remaining
  FROM public.route_stops
  WHERE route_id = v_route_id AND status IN ('pendiente', 'en_camino');

  IF v_remaining = 0 THEN
    UPDATE public.delivery_routes
       SET status = 'completada', completed_at = now()
     WHERE id = v_route_id;
  END IF;

  RETURN v_stop;
END;
$$;
