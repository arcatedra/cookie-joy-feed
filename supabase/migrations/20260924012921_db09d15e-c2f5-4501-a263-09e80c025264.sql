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
  PERFORM set_config('hazorex.delivery_fn','1', true);
  UPDATE store_orders SET repartidor_id = d.id, repartidor_nombre = d.full_name,
    estado_entrega = 'tomado', tomado_en = now()
  WHERE id = p_order_id AND estado = 'listo' AND repartidor_id IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN RAISE EXCEPTION 'Este pedido ya lo tomó otro repartidor'; END IF;
  RETURN 'tomado';
END $function$;

CREATE OR REPLACE FUNCTION public.validate_delivery_zone()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE dup text;
BEGIN
  NEW.updated_at := now();
  NEW.zip_codes := ARRAY(SELECT DISTINCT trim(z) FROM unnest(NEW.zip_codes) z WHERE trim(z) <> '');
  IF EXISTS (SELECT 1 FROM unnest(NEW.zip_codes) z WHERE z !~ '^[0-9]{3,5}$') THEN
    RAISE EXCEPTION 'Cada código debe tener de 3 a 5 dígitos';
  END IF;
  SELECT z INTO dup FROM delivery_zones dz, unnest(dz.zip_codes) z
   WHERE dz.id <> NEW.id AND z = ANY(NEW.zip_codes) LIMIT 1;
  IF dup IS NOT NULL THEN
    RAISE EXCEPTION 'El código % ya está en otra zona', dup;
  END IF;
  RETURN NEW;
END $function$;

ALTER TABLE public.delivery_zones ALTER COLUMN route_days SET DEFAULT '{}';

INSERT INTO public.delivery_zones (name, zip_codes, route_days, activo) VALUES
 ('Manhattan', ARRAY['100','101','102'], '{}', true),
 ('Bronx', ARRAY['104'], '{}', true),
 ('Staten Island', ARRAY['103'], '{}', true),
 ('Brooklyn', ARRAY['112'], '{}', true),
 ('Queens', ARRAY['110','111','113','114','116'], '{}', true)
ON CONFLICT (name) DO NOTHING;