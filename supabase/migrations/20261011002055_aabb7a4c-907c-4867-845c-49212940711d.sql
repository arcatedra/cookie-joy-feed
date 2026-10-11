ALTER TABLE public.delivery_blocks
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS actual_minutes integer,
  ADD COLUMN IF NOT EXISTS payout_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payout_id uuid;

ALTER TABLE public.delivery_block_reservations
  ADD COLUMN IF NOT EXISTS auto_assign_due_at timestamptz;

ALTER TABLE public.delivery_block_stops
  ADD COLUMN IF NOT EXISTS delivery_note text,
  ADD COLUMN IF NOT EXISTS departure_message_sent_at timestamptz;

ALTER TABLE public.delivery_claims
  ADD COLUMN IF NOT EXISTS refund_id text,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

ALTER TABLE public.driver_payouts
  ADD COLUMN IF NOT EXISTS block_id uuid REFERENCES public.delivery_blocks(id),
  ADD COLUMN IF NOT EXISTS weekly_bonus_id uuid REFERENCES public.delivery_weekly_bonuses(id);

CREATE UNIQUE INDEX IF NOT EXISTS driver_payouts_block_unique
  ON public.driver_payouts(block_id) WHERE block_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS driver_payouts_weekly_bonus_unique
  ON public.driver_payouts(weekly_bonus_id) WHERE weekly_bonus_id IS NOT NULL;

CREATE TABLE public.delivery_block_payout_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id uuid NOT NULL REFERENCES public.driver_payouts(id) ON DELETE CASCADE,
  block_id uuid NOT NULL REFERENCES public.delivery_blocks(id) ON DELETE CASCADE,
  store_order_id uuid REFERENCES public.store_orders(id),
  component text NOT NULL,
  amount_usd numeric(10,2) NOT NULL,
  operation_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  transfer_id text,
  last_error text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.delivery_block_payout_parts TO authenticated;
GRANT ALL ON public.delivery_block_payout_parts TO service_role;
ALTER TABLE public.delivery_block_payout_parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY delivery_block_payout_parts_driver_read ON public.delivery_block_payout_parts
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.driver_payouts p WHERE p.id=payout_id AND (p.driver_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE TABLE public.delivery_block_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id uuid NOT NULL REFERENCES public.delivery_blocks(id) ON DELETE CASCADE,
  stop_id uuid REFERENCES public.delivery_block_stops(id) ON DELETE CASCADE,
  store_order_id uuid NOT NULL REFERENCES public.store_orders(id),
  sender_id uuid NOT NULL,
  sender_role text NOT NULL,
  message_key text,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.delivery_block_messages TO authenticated;
GRANT ALL ON public.delivery_block_messages TO service_role;
ALTER TABLE public.delivery_block_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY delivery_block_messages_admin ON public.delivery_block_messages
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY delivery_block_messages_participant_read ON public.delivery_block_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.delivery_blocks b WHERE b.id=block_id AND b.assigned_driver_id=auth.uid())
    OR EXISTS (SELECT 1 FROM public.store_orders o WHERE o.id=store_order_id AND o.cliente_id=auth.uid())
  );
CREATE POLICY delivery_block_messages_participant_insert ON public.delivery_block_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id=auth.uid() AND (
      EXISTS (SELECT 1 FROM public.delivery_blocks b WHERE b.id=block_id AND b.assigned_driver_id=auth.uid())
      OR EXISTS (SELECT 1 FROM public.store_orders o WHERE o.id=store_order_id AND o.cliente_id=auth.uid())
    )
  );
CREATE POLICY delivery_block_messages_recipient_update ON public.delivery_block_messages
  FOR UPDATE TO authenticated
  USING (sender_id<>auth.uid()) WITH CHECK (sender_id<>auth.uid());

CREATE TABLE public.delivery_block_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id uuid NOT NULL REFERENCES public.delivery_blocks(id) ON DELETE CASCADE,
  stop_id uuid NOT NULL REFERENCES public.delivery_block_stops(id) ON DELETE CASCADE,
  store_order_id uuid NOT NULL REFERENCES public.store_orders(id),
  driver_id uuid NOT NULL REFERENCES public.drivers(id),
  customer_id uuid NOT NULL,
  stars integer NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(store_order_id)
);
GRANT SELECT, INSERT ON public.delivery_block_ratings TO authenticated;
GRANT ALL ON public.delivery_block_ratings TO service_role;
ALTER TABLE public.delivery_block_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY delivery_block_ratings_participant_read ON public.delivery_block_ratings
  FOR SELECT TO authenticated
  USING (driver_id=auth.uid() OR customer_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY delivery_block_ratings_customer_insert ON public.delivery_block_ratings
  FOR INSERT TO authenticated
  WITH CHECK (
    customer_id=auth.uid() AND stars BETWEEN 1 AND 5
    AND EXISTS (
      SELECT 1 FROM public.store_orders o
      JOIN public.delivery_block_stops s ON s.store_order_id=o.id
      JOIN public.delivery_blocks b ON b.id=s.block_id
      WHERE o.id=store_order_id AND o.cliente_id=auth.uid()
        AND s.id=stop_id AND s.status='delivered' AND b.assigned_driver_id=driver_id
    )
  );

CREATE INDEX IF NOT EXISTS delivery_block_messages_order_idx ON public.delivery_block_messages(store_order_id,created_at);
CREATE INDEX IF NOT EXISTS delivery_block_ratings_driver_idx ON public.delivery_block_ratings(driver_id,created_at);
CREATE INDEX IF NOT EXISTS delivery_claims_status_idx ON public.delivery_claims(status,created_at);
CREATE INDEX IF NOT EXISTS delivery_block_payout_parts_payout_idx ON public.delivery_block_payout_parts(payout_id,status);

CREATE TRIGGER touch_delivery_block_payout_parts BEFORE UPDATE ON public.delivery_block_payout_parts
  FOR EACH ROW EXECUTE FUNCTION public.touch_delivery_blocks_updated_at();

CREATE OR REPLACE FUNCTION public.assign_delivery_block(p_block uuid,p_driver uuid,p_actor uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE chosen_vehicle text; capacity numeric; total_weight numeric; needs_bag boolean; has_bag boolean; driver_name text; reservation_id uuid;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.delivery_block_settings WHERE singleton=true AND enabled=true) THEN RAISE EXCEPTION 'Los bloques todavía no están activos'; END IF;
 SELECT d.full_name INTO driver_name FROM public.drivers d WHERE d.id=p_driver AND d.application_status='aprobado';
 IF driver_name IS NULL THEN RAISE EXCEPTION 'Repartidor no aprobado'; END IF;
 SELECT v.vehicle_type,v.has_thermal_bag INTO chosen_vehicle,has_bag FROM public.driver_vehicles v WHERE v.driver_id=p_driver ORDER BY v.created_at DESC LIMIT 1;
 IF chosen_vehicle IS NULL THEN RAISE EXCEPTION 'El repartidor no tiene vehículo'; END IF;
 SELECT CASE chosen_vehicle WHEN 'bicicleta' THEN bike_lb WHEN 'e-bike' THEN bike_lb WHEN 'bici_carga' THEN cargo_bike_lb WHEN 'moto' THEN motorcycle_lb WHEN 'auto' THEN car_lb WHEN 'carro' THEN car_lb WHEN 'van' THEN van_lb ELSE 0 END INTO capacity FROM public.delivery_block_settings WHERE singleton=true;
 SELECT COALESCE(sum(s.weight_lb),0),COALESCE(bool_or(s.has_cold_items),false) INTO total_weight,needs_bag FROM public.delivery_block_stops s WHERE s.block_id=p_block;
 IF total_weight>capacity THEN RAISE EXCEPTION 'El vehículo no tiene capacidad para este lote'; END IF;
 IF needs_bag AND NOT COALESCE(has_bag,false) THEN RAISE EXCEPTION 'Este lote requiere bolsa térmica'; END IF;
 PERFORM 1 FROM public.delivery_blocks b WHERE b.id=p_block AND b.status IN ('published','reserved') AND b.assigned_driver_id IS NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'El lote ya no está disponible'; END IF;
 SELECT r.id INTO reservation_id FROM public.delivery_block_reservations r WHERE r.block_id=p_block AND r.driver_id=p_driver AND r.status IN ('reserved','present') ORDER BY r.reserved_at LIMIT 1;
 IF reservation_id IS NULL THEN RAISE EXCEPTION 'El repartidor no reservó este lote'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.delivery_block_reservations r WHERE r.id=reservation_id AND r.present_at IS NOT NULL) THEN RAISE EXCEPTION 'El repartidor debe registrar su presencia'; END IF;
 UPDATE public.delivery_blocks SET assigned_driver_id=p_driver,assigned_at=now(),accepted_at=now(),accepted_pay=committed_pay,status='assigned',is_open=false WHERE id=p_block;
 UPDATE public.delivery_block_reservations SET status='assigned' WHERE id=reservation_id;
 UPDATE public.store_orders o SET repartidor_id=p_driver,repartidor_nombre=driver_name,estado_entrega='tomado',tomado_en=now()
   FROM public.delivery_block_stops s WHERE s.block_id=p_block AND s.store_order_id=o.id;
 INSERT INTO public.delivery_block_events(block_id,actor_id,event_type,details) VALUES(p_block,p_actor,'assigned',jsonb_build_object('driver_id',p_driver,'vehicle_type',chosen_vehicle));
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.assign_delivery_block(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.assign_delivery_block(uuid,uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.mark_delivery_block_present(p_reservation uuid,p_driver uuid)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE due_at timestamptz; target_block uuid; wait_minutes integer;
BEGIN
 SELECT auto_assign_minutes INTO wait_minutes FROM public.delivery_block_settings WHERE singleton=true AND enabled=true;
 IF wait_minutes IS NULL THEN RAISE EXCEPTION 'Los bloques todavía no están activos'; END IF;
 UPDATE public.delivery_block_reservations SET present_at=COALESCE(present_at,now()),status='present',auto_assign_due_at=COALESCE(auto_assign_due_at,now()+make_interval(mins=>wait_minutes))
  WHERE id=p_reservation AND driver_id=p_driver AND status IN ('reserved','present')
  RETURNING auto_assign_due_at,block_id INTO due_at,target_block;
 IF target_block IS NULL THEN RAISE EXCEPTION 'Reserva no disponible'; END IF;
 INSERT INTO public.delivery_block_events(block_id,actor_id,event_type,details) VALUES(target_block,p_driver,'driver_present',jsonb_build_object('auto_assign_due_at',due_at));
 RETURN due_at;
END $$;
REVOKE ALL ON FUNCTION public.mark_delivery_block_present(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.mark_delivery_block_present(uuid,uuid) TO service_role;