CREATE TABLE public.delivery_block_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  enabled boolean NOT NULL DEFAULT false,
  min_orders integer NOT NULL DEFAULT 3,
  suggested_pay numeric(10,2) NOT NULL DEFAULT 40,
  minimum_hourly numeric(10,2) NOT NULL DEFAULT 23,
  small_max_lb numeric(10,2) NOT NULL DEFAULT 15,
  medium_max_lb numeric(10,2) NOT NULL DEFAULT 30,
  included_lb numeric(10,2) NOT NULL DEFAULT 45,
  max_order_lb numeric(10,2) NOT NULL DEFAULT 80,
  small_fee numeric(10,2) NOT NULL DEFAULT 12,
  medium_fee numeric(10,2) NOT NULL DEFAULT 25,
  large_fee numeric(10,2) NOT NULL DEFAULT 35,
  extra_lb_fee numeric(10,2) NOT NULL DEFAULT 0.70,
  elevator_fee numeric(10,2) NOT NULL DEFAULT 5,
  stairs_fee numeric(10,2) NOT NULL DEFAULT 8,
  elevator_minutes integer NOT NULL DEFAULT 5,
  stairs_minutes integer NOT NULL DEFAULT 8,
  heavy_item_lb numeric(10,2) NOT NULL DEFAULT 8,
  light_stops_hour numeric(10,2) NOT NULL DEFAULT 5,
  other_stops_hour numeric(10,2) NOT NULL DEFAULT 4,
  auto_assign_minutes integer NOT NULL DEFAULT 15,
  unassigned_alert_hours integer NOT NULL DEFAULT 12,
  bike_lb numeric(10,2) NOT NULL DEFAULT 50,
  cargo_bike_lb numeric(10,2) NOT NULL DEFAULT 200,
  motorcycle_lb numeric(10,2) NOT NULL DEFAULT 60,
  car_lb numeric(10,2) NOT NULL DEFAULT 400,
  van_lb numeric(10,2) NOT NULL DEFAULT 1000,
  weekly_bonus numeric(10,2) NOT NULL DEFAULT 25,
  bonus_min_blocks integer NOT NULL DEFAULT 5,
  bonus_on_time_pct numeric(5,2) NOT NULL DEFAULT 95,
  bonus_rating numeric(3,2) NOT NULL DEFAULT 4.7,
  late_cancel_hours integer NOT NULL DEFAULT 12,
  priority_penalty_days integer NOT NULL DEFAULT 7,
  overtime_minutes integer NOT NULL DEFAULT 30,
  no_show_minutes integer NOT NULL DEFAULT 5,
  claim_hours integer NOT NULL DEFAULT 24,
  legal_rate_reviewed_at date,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.delivery_block_settings TO authenticated;
GRANT ALL ON public.delivery_block_settings TO service_role;
ALTER TABLE public.delivery_block_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY delivery_block_settings_read ON public.delivery_block_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY delivery_block_settings_admin ON public.delivery_block_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.delivery_blocks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 zone_id uuid REFERENCES public.delivery_zones(id),
 zone_name text NOT NULL,
 dispatch_date date NOT NULL,
 starts_at timestamptz NOT NULL,
 estimated_minutes integer NOT NULL,
 status text NOT NULL DEFAULT 'draft',
 pricing_model text NOT NULL DEFAULT 'reservable_block_v1',
 base_pay numeric(10,2) NOT NULL DEFAULT 40,
 manual_increase numeric(10,2) NOT NULL DEFAULT 0,
 door_bonus_enabled boolean NOT NULL DEFAULT false,
 door_bonus_amount numeric(10,2) NOT NULL DEFAULT 0,
 tips_total numeric(10,2) NOT NULL DEFAULT 0,
 committed_pay numeric(10,2) NOT NULL DEFAULT 40,
 order_funding numeric(10,2) NOT NULL DEFAULT 0,
 hazorex_funding numeric(10,2) NOT NULL DEFAULT 0,
 estimated_trips integer NOT NULL DEFAULT 1,
 requires_thermal_bag boolean NOT NULL DEFAULT false,
 is_open boolean NOT NULL DEFAULT false,
 unassigned_alerted_at timestamptz,
 published_at timestamptz,
 assigned_driver_id uuid REFERENCES public.drivers(id),
 assigned_at timestamptz,
 accepted_pay numeric(10,2),
 accepted_at timestamptz,
 completed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_blocks TO authenticated;
GRANT ALL ON public.delivery_blocks TO service_role;
ALTER TABLE public.delivery_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY delivery_blocks_admin ON public.delivery_blocks FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY delivery_blocks_driver_read ON public.delivery_blocks FOR SELECT TO authenticated USING (assigned_driver_id=auth.uid() OR (is_open AND status='published'));

CREATE TABLE public.delivery_block_reservations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), block_id uuid NOT NULL REFERENCES public.delivery_blocks(id) ON DELETE CASCADE,
 driver_id uuid NOT NULL REFERENCES public.drivers(id), status text NOT NULL DEFAULT 'reserved', reserved_at timestamptz NOT NULL DEFAULT now(),
 present_at timestamptz, cancelled_at timestamptz, cancel_reason text, priority_penalty_until timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(block_id), UNIQUE(driver_id, block_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_block_reservations TO authenticated;
GRANT ALL ON public.delivery_block_reservations TO service_role;
ALTER TABLE public.delivery_block_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY block_reservations_admin ON public.delivery_block_reservations FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY block_reservations_driver_read ON public.delivery_block_reservations FOR SELECT TO authenticated USING (driver_id=auth.uid());

CREATE TABLE public.delivery_block_trips (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), block_id uuid NOT NULL REFERENCES public.delivery_blocks(id) ON DELETE CASCADE,
 trip_number integer NOT NULL, vehicle_type text NOT NULL, weight_lb numeric(10,2) NOT NULL DEFAULT 0,
 status text NOT NULL DEFAULT 'planned', picked_up_at timestamptz, completed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(block_id,trip_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_block_trips TO authenticated;
GRANT ALL ON public.delivery_block_trips TO service_role;
ALTER TABLE public.delivery_block_trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY block_trips_admin ON public.delivery_block_trips FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY block_trips_driver_read ON public.delivery_block_trips FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.delivery_blocks b WHERE b.id=block_id AND b.assigned_driver_id=auth.uid()));

CREATE TABLE public.delivery_block_stops (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), block_id uuid NOT NULL REFERENCES public.delivery_blocks(id) ON DELETE CASCADE,
 trip_id uuid REFERENCES public.delivery_block_trips(id) ON DELETE SET NULL, store_order_id uuid NOT NULL REFERENCES public.store_orders(id),
 sequence_number integer NOT NULL, size_label text NOT NULL, weight_lb numeric(10,2) NOT NULL,
 heavy_items integer NOT NULL DEFAULT 0, has_cold_items boolean NOT NULL DEFAULT false, requires_safe_return boolean NOT NULL DEFAULT false,
 door_service text NOT NULL DEFAULT 'lobby', door_service_fee numeric(10,2) NOT NULL DEFAULT 0,
 window_start timestamptz, window_end timestamptz, estimated_minutes integer NOT NULL DEFAULT 0,
 status text NOT NULL DEFAULT 'pending', departed_at timestamptz, eta timestamptz, arrived_at timestamptz,
 wait_started_at timestamptz, delivered_at timestamptz, delivery_photo_url text, returned_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(store_order_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_block_stops TO authenticated;
GRANT ALL ON public.delivery_block_stops TO service_role;
ALTER TABLE public.delivery_block_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY block_stops_admin ON public.delivery_block_stops FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY block_stops_driver_read ON public.delivery_block_stops FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.delivery_blocks b WHERE b.id=block_id AND b.assigned_driver_id=auth.uid()));
CREATE POLICY block_stops_customer_read ON public.delivery_block_stops FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.store_orders o WHERE o.id=store_order_id AND o.cliente_id=auth.uid()));

CREATE TABLE public.delivery_block_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), block_id uuid NOT NULL REFERENCES public.delivery_blocks(id) ON DELETE CASCADE,
 stop_id uuid REFERENCES public.delivery_block_stops(id) ON DELETE CASCADE, actor_id uuid, event_type text NOT NULL,
 occurred_at timestamptz NOT NULL DEFAULT now(), details jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT ON public.delivery_block_events TO authenticated;
GRANT ALL ON public.delivery_block_events TO service_role;
ALTER TABLE public.delivery_block_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY block_events_admin ON public.delivery_block_events FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY block_events_driver_read ON public.delivery_block_events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.delivery_blocks b WHERE b.id=block_id AND b.assigned_driver_id=auth.uid()));

CREATE TABLE public.delivery_weekly_bonuses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), driver_id uuid NOT NULL REFERENCES public.drivers(id), week_start date NOT NULL,
 eligible_blocks integer NOT NULL DEFAULT 0, on_time_pct numeric(5,2) NOT NULL DEFAULT 0, late_cancellations integer NOT NULL DEFAULT 0,
 rating numeric(3,2), confirmed_claims integer NOT NULL DEFAULT 0, amount numeric(10,2) NOT NULL DEFAULT 25,
 status text NOT NULL DEFAULT 'candidate', approved_by uuid, approved_at timestamptz, paid_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(driver_id,week_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_weekly_bonuses TO authenticated;
GRANT ALL ON public.delivery_weekly_bonuses TO service_role;
ALTER TABLE public.delivery_weekly_bonuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY weekly_bonuses_admin ON public.delivery_weekly_bonuses FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY weekly_bonuses_driver_read ON public.delivery_weekly_bonuses FOR SELECT TO authenticated USING (driver_id=auth.uid());

CREATE TABLE public.delivery_claims (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), store_order_id uuid NOT NULL REFERENCES public.store_orders(id), stop_id uuid REFERENCES public.delivery_block_stops(id),
 customer_id uuid NOT NULL, reason text NOT NULL, description text, photo_url text, status text NOT NULL DEFAULT 'submitted',
 resolution text, refund_amount numeric(10,2), resolved_by uuid, resolved_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.delivery_claims TO authenticated;
GRANT ALL ON public.delivery_claims TO service_role;
ALTER TABLE public.delivery_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY delivery_claims_admin ON public.delivery_claims FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY delivery_claims_customer_read ON public.delivery_claims FOR SELECT TO authenticated USING (customer_id=auth.uid());
CREATE POLICY delivery_claims_customer_insert ON public.delivery_claims FOR INSERT TO authenticated WITH CHECK (customer_id=auth.uid() AND EXISTS (SELECT 1 FROM public.store_orders o WHERE o.id=store_order_id AND o.cliente_id=auth.uid()));

ALTER TABLE public.driver_vehicles ADD COLUMN IF NOT EXISTS has_thermal_bag boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.touch_delivery_blocks_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
CREATE TRIGGER touch_delivery_block_settings BEFORE UPDATE ON public.delivery_block_settings FOR EACH ROW EXECUTE FUNCTION public.touch_delivery_blocks_updated_at();
CREATE TRIGGER touch_delivery_blocks BEFORE UPDATE ON public.delivery_blocks FOR EACH ROW EXECUTE FUNCTION public.touch_delivery_blocks_updated_at();
CREATE TRIGGER touch_delivery_block_reservations BEFORE UPDATE ON public.delivery_block_reservations FOR EACH ROW EXECUTE FUNCTION public.touch_delivery_blocks_updated_at();
CREATE TRIGGER touch_delivery_block_trips BEFORE UPDATE ON public.delivery_block_trips FOR EACH ROW EXECUTE FUNCTION public.touch_delivery_blocks_updated_at();
CREATE TRIGGER touch_delivery_block_stops BEFORE UPDATE ON public.delivery_block_stops FOR EACH ROW EXECUTE FUNCTION public.touch_delivery_blocks_updated_at();
CREATE TRIGGER touch_delivery_weekly_bonuses BEFORE UPDATE ON public.delivery_weekly_bonuses FOR EACH ROW EXECUTE FUNCTION public.touch_delivery_blocks_updated_at();
CREATE TRIGGER touch_delivery_claims BEFORE UPDATE ON public.delivery_claims FOR EACH ROW EXECUTE FUNCTION public.touch_delivery_blocks_updated_at();

CREATE OR REPLACE FUNCTION public.validate_delivery_block() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
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
CREATE TRIGGER validate_delivery_block_before_write BEFORE INSERT OR UPDATE ON public.delivery_blocks FOR EACH ROW EXECUTE FUNCTION public.validate_delivery_block();

CREATE OR REPLACE FUNCTION public.reserve_delivery_block(p_block uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE reservation uuid;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.drivers d WHERE d.id=auth.uid() AND d.application_status='aprobado') THEN RAISE EXCEPTION 'Repartidor no aprobado'; END IF;
 IF EXISTS (SELECT 1 FROM public.delivery_block_reservations r JOIN public.delivery_blocks b ON b.id=r.block_id WHERE r.driver_id=auth.uid() AND r.status IN ('reserved','present','assigned') AND b.status NOT IN ('completed','cancelled')) THEN RAISE EXCEPTION 'Ya tienes un lote activo'; END IF;
 INSERT INTO public.delivery_block_reservations(block_id,driver_id) VALUES(p_block,auth.uid()) RETURNING id INTO reservation;
 RETURN reservation;
END $$;
REVOKE ALL ON FUNCTION public.reserve_delivery_block(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_delivery_block(uuid) TO authenticated;

INSERT INTO public.delivery_block_settings(singleton) VALUES(true) ON CONFLICT(singleton) DO NOTHING;