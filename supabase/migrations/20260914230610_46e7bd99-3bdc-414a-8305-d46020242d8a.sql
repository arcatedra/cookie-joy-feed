DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'route_status') THEN
    CREATE TYPE public.route_status AS ENUM ('disponible','asignada','en_transito','completada','cancelada');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stop_status') THEN
    CREATE TYPE public.stop_status AS ENUM ('pendiente','en_camino','entregado','fallido');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.delivery_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_name text NOT NULL,
  dispatch_date date NOT NULL DEFAULT (now() AT TIME ZONE 'America/New_York')::date,
  total_stops int NOT NULL DEFAULT 0,
  status public.route_status NOT NULL DEFAULT 'disponible',
  driver_id uuid,
  accepted_at timestamptz,
  warehouse_checkin_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.delivery_routes TO authenticated;
GRANT ALL ON public.delivery_routes TO service_role;
ALTER TABLE public.delivery_routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS delivery_routes_select ON public.delivery_routes;
CREATE POLICY delivery_routes_select ON public.delivery_routes
  FOR SELECT TO authenticated
  USING (driver_id = auth.uid() OR status = 'disponible' OR public.has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS delivery_routes_admin_manage ON public.delivery_routes;
CREATE POLICY delivery_routes_admin_manage ON public.delivery_routes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.route_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.delivery_routes(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.pedidos(id),
  sequence_number int NOT NULL,
  eta timestamptz,
  status public.stop_status NOT NULL DEFAULT 'pendiente',
  delivery_address text,
  recipient_name text,
  delivery_photo_url text,
  failure_reason text,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (route_id, sequence_number),
  UNIQUE (route_id, order_id)
);
CREATE INDEX IF NOT EXISTS idx_route_stops_route_sequence ON public.route_stops (route_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_route_stops_order ON public.route_stops (order_id);

GRANT SELECT ON public.route_stops TO authenticated;
GRANT UPDATE ON public.route_stops TO authenticated;
GRANT ALL ON public.route_stops TO service_role;
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS route_stops_select_own_route ON public.route_stops;
CREATE POLICY route_stops_select_own_route ON public.route_stops
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.delivery_routes r
             WHERE r.id = route_stops.route_id AND r.driver_id = auth.uid())
    OR public.has_role(auth.uid(),'admin'::app_role)
  );

DROP POLICY IF EXISTS route_stops_driver_update ON public.route_stops;
CREATE POLICY route_stops_driver_update ON public.route_stops
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.delivery_routes r
                  WHERE r.id = route_stops.route_id AND r.driver_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.delivery_routes r
                  WHERE r.id = route_stops.route_id AND r.driver_id = auth.uid()));

DROP POLICY IF EXISTS route_stops_admin_manage ON public.route_stops;
CREATE POLICY route_stops_admin_manage ON public.route_stops
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.delivery_settings (
  key text PRIMARY KEY,
  value_int int NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.delivery_settings TO authenticated;
GRANT ALL ON public.delivery_settings TO service_role;
ALTER TABLE public.delivery_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS delivery_settings_read ON public.delivery_settings;
CREATE POLICY delivery_settings_read ON public.delivery_settings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS delivery_settings_admin ON public.delivery_settings;
CREATE POLICY delivery_settings_admin ON public.delivery_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

INSERT INTO public.delivery_settings (key, value_int)
VALUES ('minutes_per_stop', 12)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.minutes_per_stop()
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT value_int FROM public.delivery_settings WHERE key = 'minutes_per_stop'), 12);
$$;

CREATE OR REPLACE FUNCTION public.recalculate_route_etas(p_route_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_min int := public.minutes_per_stop();
  v_base timestamptz;
  v_base_seq int := 0;
BEGIN
  SELECT rs.delivered_at, rs.sequence_number
    INTO v_base, v_base_seq
    FROM public.route_stops rs
   WHERE rs.route_id = p_route_id AND rs.delivered_at IS NOT NULL
   ORDER BY rs.delivered_at DESC
   LIMIT 1;

  IF v_base IS NULL THEN
    SELECT COALESCE(r.warehouse_checkin_at,
                    (r.dispatch_date::timestamp + time '09:00') AT TIME ZONE 'America/New_York')
      INTO v_base
      FROM public.delivery_routes r
     WHERE r.id = p_route_id;
    v_base_seq := 0;
  END IF;

  IF v_base IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.route_stops rs
     SET eta = v_base + make_interval(mins => (rs.sequence_number - v_base_seq) * v_min),
         updated_at = now()
   WHERE rs.route_id = p_route_id
     AND rs.status IN ('pendiente','en_camino');
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_route_stop_recalc_etas()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'entregado' AND COALESCE(OLD.status::text,'') <> 'entregado' THEN
    PERFORM public.recalculate_route_etas(NEW.route_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS route_stops_recalc_etas ON public.route_stops;
CREATE TRIGGER route_stops_recalc_etas
AFTER UPDATE OF status ON public.route_stops
FOR EACH ROW EXECUTE FUNCTION public.trg_route_stop_recalc_etas();

CREATE OR REPLACE FUNCTION public.trg_route_stops_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS route_stops_set_updated_at ON public.route_stops;
CREATE TRIGGER route_stops_set_updated_at
BEFORE UPDATE ON public.route_stops
FOR EACH ROW EXECUTE FUNCTION public.trg_route_stops_set_updated_at();

DROP TRIGGER IF EXISTS delivery_routes_set_updated_at ON public.delivery_routes;
CREATE TRIGGER delivery_routes_set_updated_at
BEFORE UPDATE ON public.delivery_routes
FOR EACH ROW EXECUTE FUNCTION public.trg_route_stops_set_updated_at();

CREATE OR REPLACE FUNCTION public.get_my_stop_eta(p_order_id uuid)
RETURNS TABLE(eta timestamptz, sequence_number int, total_stops int, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT rs.eta, rs.sequence_number,
         GREATEST(r.total_stops, (SELECT COUNT(*)::int FROM public.route_stops x WHERE x.route_id = r.id)),
         rs.status::text
    FROM public.route_stops rs
    JOIN public.delivery_routes r ON r.id = rs.route_id
    JOIN public.pedidos p ON p.id = rs.order_id
   WHERE rs.order_id = p_order_id
     AND p.cliente_id = auth.uid()
   LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_stop_eta(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recalculate_route_etas(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.minutes_per_stop() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_stop_eta(uuid) TO authenticated;