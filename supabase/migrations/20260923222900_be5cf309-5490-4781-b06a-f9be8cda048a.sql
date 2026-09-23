ALTER TABLE public.store_orders
  ADD COLUMN IF NOT EXISTS estado_entrega text,
  ADD COLUMN IF NOT EXISTS tomado_en timestamptz,
  ADD COLUMN IF NOT EXISTS recogido_en timestamptz,
  ADD COLUMN IF NOT EXISTS en_camino_en timestamptz,
  ADD COLUMN IF NOT EXISTS entregado_en timestamptz,
  ADD COLUMN IF NOT EXISTS foto_entrega_url text,
  ADD COLUMN IF NOT EXISTS repartidor_nombre text;

CREATE INDEX IF NOT EXISTS store_orders_delivery_idx ON public.store_orders (estado, repartidor_id);

CREATE OR REPLACE FUNCTION public.store_orders_protect_delivery()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE role_name text := current_setting('request.jwt.claim.role', true);
BEGIN
  IF role_name = 'service_role' OR auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF current_setting('hazorex.delivery_fn', true) = '1' THEN RETURN NEW; END IF;
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN RETURN NEW; END IF;
  IF NEW.repartidor_id IS DISTINCT FROM OLD.repartidor_id
     OR NEW.estado_entrega IS DISTINCT FROM OLD.estado_entrega
     OR NEW.tomado_en IS DISTINCT FROM OLD.tomado_en
     OR NEW.recogido_en IS DISTINCT FROM OLD.recogido_en
     OR NEW.en_camino_en IS DISTINCT FROM OLD.en_camino_en
     OR NEW.entregado_en IS DISTINCT FROM OLD.entregado_en
     OR NEW.foto_entrega_url IS DISTINCT FROM OLD.foto_entrega_url
     OR NEW.repartidor_nombre IS DISTINCT FROM OLD.repartidor_nombre
     OR (NEW.estado = 'entregado' AND OLD.estado IS DISTINCT FROM 'entregado')
  THEN
    RAISE EXCEPTION 'La entrega solo la actualiza el repartidor asignado';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.store_orders_protect_delivery() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS store_orders_protect_delivery ON public.store_orders;
CREATE TRIGGER store_orders_protect_delivery BEFORE UPDATE ON public.store_orders
  FOR EACH ROW EXECUTE FUNCTION public.store_orders_protect_delivery();

-- Tomar pedido (atómico)
CREATE OR REPLACE FUNCTION public.claim_store_order(p_order_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d record; o record; has_car boolean; n int;
BEGIN
  SELECT id, full_name, work_zone, application_status INTO d FROM drivers WHERE id = auth.uid();
  IF d.id IS NULL OR d.application_status <> 'aprobado' THEN
    RAISE EXCEPTION 'Solo repartidores aprobados pueden tomar pedidos';
  END IF;
  SELECT * INTO o FROM store_orders WHERE id = p_order_id;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Pedido no encontrado'; END IF;
  SELECT EXISTS (SELECT 1 FROM driver_vehicles WHERE driver_id = d.id AND vehicle_type IN ('auto','carro','car')) INTO has_car;
  IF COALESCE(o.peso_total_lb,0) > 45 AND NOT has_car THEN
    RAISE EXCEPTION 'Este pedido pesa más de 45 lb y requiere auto';
  END IF;
  IF d.work_zone IS NOT NULL AND d.work_zone <> 'Otra zona'
     AND lower(COALESCE(o.direccion_envio->>'city','')) <> lower(d.work_zone) THEN
    RAISE EXCEPTION 'Este pedido no es de tu zona';
  END IF;
  PERFORM set_config('hazorex.delivery_fn','1', true);
  UPDATE store_orders SET repartidor_id = d.id, repartidor_nombre = d.full_name,
    estado_entrega = 'tomado', tomado_en = now()
  WHERE id = p_order_id AND estado = 'listo' AND repartidor_id IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN RAISE EXCEPTION 'Este pedido ya lo tomó otro repartidor'; END IF;
  RETURN 'tomado';
END $$;
REVOKE EXECUTE ON FUNCTION public.claim_store_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_store_order(uuid) TO authenticated;

-- Avanzar pasos
CREATE OR REPLACE FUNCTION public.advance_store_delivery(p_order_id uuid, p_step text, p_photo text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o record; n int;
BEGIN
  SELECT * INTO o FROM store_orders WHERE id = p_order_id;
  IF o.id IS NULL OR o.repartidor_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Este pedido no está asignado a ti';
  END IF;
  PERFORM set_config('hazorex.delivery_fn','1', true);
  IF p_step = 'recogido' AND o.estado_entrega = 'tomado' THEN
    UPDATE store_orders SET estado_entrega='recogido', recogido_en=now() WHERE id=o.id;
  ELSIF p_step = 'en_camino' AND o.estado_entrega = 'recogido' THEN
    UPDATE store_orders SET estado_entrega='en_camino', en_camino_en=now() WHERE id=o.id;
  ELSIF p_step = 'entregado' AND o.estado_entrega = 'en_camino' THEN
    IF p_photo IS NULL OR p_photo NOT LIKE (auth.uid()::text || '/%') THEN
      RAISE EXCEPTION 'La foto de entrega es obligatoria';
    END IF;
    UPDATE store_orders SET estado_entrega='entregado', entregado_en=now(), foto_entrega_url=p_photo, estado='entregado'
    WHERE id=o.id AND estado='listo';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n = 0 THEN RAISE EXCEPTION 'El pedido no está listo para entregarse'; END IF;
  ELSE
    RAISE EXCEPTION 'Paso no válido';
  END IF;
  RETURN p_step;
END $$;
REVOKE EXECUTE ON FUNCTION public.advance_store_delivery(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.advance_store_delivery(uuid, text, text) TO authenticated;

-- Historial de pagos automáticos
CREATE TABLE public.payout_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'cron',
  transfers_ok integer NOT NULL DEFAULT 0,
  total_usd numeric NOT NULL DEFAULT 0,
  pending integer NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb
);
GRANT SELECT ON public.payout_runs TO authenticated;
GRANT ALL ON public.payout_runs TO service_role;
ALTER TABLE public.payout_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payout_runs_admin_read" ON public.payout_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fotos de entrega
CREATE POLICY "delivery_photos_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'delivery-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "delivery_photos_read_own_admin" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'delivery-photos' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin'::app_role)));