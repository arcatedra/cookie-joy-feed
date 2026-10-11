CREATE OR REPLACE FUNCTION public.validate_delivery_block() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE c public.delivery_block_settings%ROWTYPE; stop_count integer; minimum_pay numeric;
BEGIN
 SELECT * INTO c FROM public.delivery_block_settings WHERE singleton=true;
 IF NEW.estimated_minutes < 60 OR NEW.estimated_minutes > 240 THEN RAISE EXCEPTION 'El bloque debe durar entre una y cuatro horas'; END IF;
 NEW.manual_increase:=greatest(0,NEW.manual_increase); NEW.door_bonus_amount:=CASE WHEN NEW.door_bonus_enabled THEN greatest(0,NEW.door_bonus_amount) ELSE 0 END;
 NEW.committed_pay:=NEW.base_pay+NEW.manual_increase+NEW.door_bonus_amount;
 IF NEW.status IN ('published','reserved','assigned','active','completed') THEN
   SELECT count(*) INTO stop_count FROM public.delivery_block_stops WHERE block_id=NEW.id;
   IF stop_count < coalesce(c.min_orders,3) THEN RAISE EXCEPTION 'Un lote necesita al menos % pedidos',coalesce(c.min_orders,3); END IF;
   minimum_pay:=ceil(coalesce(c.minimum_hourly,23)*100*NEW.estimated_minutes/60)/100;
   IF NEW.base_pay < minimum_pay THEN RAISE EXCEPTION 'El pago base mínimo para este tiempo es $%',minimum_pay; END IF;
 END IF;
 IF OLD.status IN ('reserved','assigned','active','completed') AND NEW.committed_pay < OLD.committed_pay THEN RAISE EXCEPTION 'No se puede reducir un pago ya aceptado'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validate_delivery_block() FROM PUBLIC, anon, authenticated;

CREATE POLICY block_reservations_driver_insert ON public.delivery_block_reservations FOR INSERT TO authenticated WITH CHECK (driver_id=auth.uid() AND EXISTS (SELECT 1 FROM public.drivers d WHERE d.id=auth.uid() AND d.application_status='aprobado'));
CREATE POLICY block_reservations_driver_update ON public.delivery_block_reservations FOR UPDATE TO authenticated USING (driver_id=auth.uid()) WITH CHECK (driver_id=auth.uid());

CREATE OR REPLACE FUNCTION public.reserve_delivery_block(p_block uuid) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE reservation uuid;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.drivers d WHERE d.id=auth.uid() AND d.application_status='aprobado') THEN RAISE EXCEPTION 'Repartidor no aprobado'; END IF;
 IF EXISTS (SELECT 1 FROM public.delivery_block_reservations r JOIN public.delivery_blocks b ON b.id=r.block_id WHERE r.driver_id=auth.uid() AND r.status IN ('reserved','present','assigned') AND b.status NOT IN ('completed','cancelled')) THEN RAISE EXCEPTION 'Ya tienes un lote activo'; END IF;
 INSERT INTO public.delivery_block_reservations(block_id,driver_id) VALUES(p_block,auth.uid()) RETURNING id INTO reservation;
 RETURN reservation;
END $$;
REVOKE ALL ON FUNCTION public.reserve_delivery_block(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_delivery_block(uuid) TO authenticated;