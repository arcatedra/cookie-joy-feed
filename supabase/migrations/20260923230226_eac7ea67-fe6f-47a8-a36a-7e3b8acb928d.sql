CREATE TABLE public.delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  zip_codes text[] NOT NULL DEFAULT '{}',
  route_days int[] NOT NULL DEFAULT '{1,3,5}',
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.delivery_zones TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.delivery_zones TO authenticated;
GRANT ALL ON public.delivery_zones TO service_role;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zones_read" ON public.delivery_zones FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "zones_admin_write" ON public.delivery_zones FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE OR REPLACE FUNCTION public.validate_delivery_zone() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE dup text;
BEGIN
  NEW.updated_at := now();
  NEW.zip_codes := ARRAY(SELECT DISTINCT trim(z) FROM unnest(NEW.zip_codes) z WHERE trim(z) <> '');
  IF EXISTS (SELECT 1 FROM unnest(NEW.zip_codes) z WHERE z !~ '^[0-9]{5}$') THEN
    RAISE EXCEPTION 'Los códigos postales deben tener 5 dígitos';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(NEW.route_days) d WHERE d < 0 OR d > 6) THEN
    RAISE EXCEPTION 'Día de ruta inválido';
  END IF;
  SELECT z INTO dup FROM delivery_zones dz, unnest(dz.zip_codes) z
   WHERE dz.id <> NEW.id AND z = ANY(NEW.zip_codes) LIMIT 1;
  IF dup IS NOT NULL THEN
    RAISE EXCEPTION 'El código postal % ya está en otra zona', dup;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_delivery_zones_validate BEFORE INSERT OR UPDATE ON public.delivery_zones
  FOR EACH ROW EXECUTE FUNCTION public.validate_delivery_zone();

CREATE TABLE public.driver_zones (
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  zone_id uuid NOT NULL REFERENCES public.delivery_zones(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (driver_id, zone_id)
);
GRANT SELECT, INSERT, DELETE ON public.driver_zones TO authenticated;
GRANT ALL ON public.driver_zones TO service_role;
ALTER TABLE public.driver_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "driver_zones_own" ON public.driver_zones FOR ALL TO authenticated
  USING (driver_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (driver_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

CREATE OR REPLACE FUNCTION public.claim_store_order(p_order_id uuid)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE d record; o record; has_car boolean; n int;
BEGIN
  SELECT id, full_name, application_status INTO d FROM drivers WHERE id = auth.uid();
  IF d.id IS NULL OR d.application_status <> 'aprobado' THEN
    RAISE EXCEPTION 'Solo repartidores aprobados pueden tomar pedidos';
  END IF;
  SELECT * INTO o FROM store_orders WHERE id = p_order_id;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Pedido no encontrado'; END IF;
  SELECT EXISTS (SELECT 1 FROM driver_vehicles WHERE driver_id = d.id AND vehicle_type IN ('auto','carro','car')) INTO has_car;
  IF COALESCE(o.peso_total_lb,0) > 45 AND NOT has_car THEN
    RAISE EXCEPTION 'Este pedido pesa más de 45 lb y requiere auto';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM driver_zones dzn JOIN delivery_zones z ON z.id = dzn.zone_id
     WHERE dzn.driver_id = d.id AND z.activo
       AND left(trim(COALESCE(o.direccion_envio->>'zip','')),5) = ANY(z.zip_codes)
  ) THEN
    RAISE EXCEPTION 'Este pedido no es de tu zona';
  END IF;
  PERFORM set_config('hazorex.delivery_fn','1', true);
  UPDATE store_orders SET repartidor_id = d.id, repartidor_nombre = d.full_name,
    estado_entrega = 'tomado', tomado_en = now()
  WHERE id = p_order_id AND estado = 'listo' AND repartidor_id IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN RAISE EXCEPTION 'Este pedido ya lo tomó otro repartidor'; END IF;
  RETURN 'tomado';
END $function$;