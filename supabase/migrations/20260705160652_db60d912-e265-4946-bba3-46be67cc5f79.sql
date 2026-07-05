CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TYPE public.courier_order_status AS ENUM ('disponible','aceptado','en_recoleccion','en_camino_entrega','completado','cancelado');
CREATE TYPE public.courier_stop_status AS ENUM ('pendiente','en_camino','entregado','fallido');
CREATE TYPE public.courier_proof_type AS ENUM ('foto','firma','codigo','ninguno');

ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS preferred_gps_app text CHECK (preferred_gps_app IN ('google','waze','apple'));

CREATE TABLE public.courier_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  status public.courier_order_status NOT NULL DEFAULT 'disponible',
  pickup_address text NOT NULL,
  pickup_lat numeric(10,7) NOT NULL,
  pickup_lng numeric(10,7) NOT NULL,
  pickup_contact_name text,
  pickup_notes text,
  estimated_earnings numeric(10,2) NOT NULL DEFAULT 0,
  estimated_duration_minutes integer NOT NULL DEFAULT 0,
  accepted_at timestamptz,
  picked_up_at timestamptz,
  completed_at timestamptz,
  cancellation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courier_orders TO authenticated;
GRANT ALL ON public.courier_orders TO service_role;
ALTER TABLE public.courier_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approved drivers view available orders" ON public.courier_orders FOR SELECT TO authenticated
  USING (status = 'disponible' AND driver_id IS NULL
    AND EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = auth.uid() AND d.application_status = 'aprobado' AND d.is_active));
CREATE POLICY "drivers view own orders" ON public.courier_orders FOR SELECT TO authenticated USING (driver_id = auth.uid());
CREATE POLICY "drivers update own orders" ON public.courier_orders FOR UPDATE TO authenticated
  USING (driver_id = auth.uid()) WITH CHECK (driver_id = auth.uid());
CREATE POLICY "approved drivers claim orders" ON public.courier_orders FOR UPDATE TO authenticated
  USING (status = 'disponible' AND driver_id IS NULL
    AND EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = auth.uid() AND d.application_status = 'aprobado' AND d.is_active))
  WITH CHECK (driver_id = auth.uid());
CREATE POLICY "admins manage courier orders" ON public.courier_orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.courier_order_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.courier_orders(id) ON DELETE CASCADE,
  sequence_number integer NOT NULL,
  delivery_address text NOT NULL,
  delivery_lat numeric(10,7) NOT NULL,
  delivery_lng numeric(10,7) NOT NULL,
  recipient_name text,
  recipient_phone text,
  status public.courier_stop_status NOT NULL DEFAULT 'pendiente',
  proof_type public.courier_proof_type NOT NULL DEFAULT 'ninguno',
  proof_url text,
  proof_code text,
  failure_reason text,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, sequence_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courier_order_stops TO authenticated;
GRANT ALL ON public.courier_order_stops TO service_role;
ALTER TABLE public.courier_order_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drivers view stops of own orders" ON public.courier_order_stops FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courier_orders o WHERE o.id = order_id AND o.driver_id = auth.uid()));
CREATE POLICY "drivers update stops of own orders" ON public.courier_order_stops FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courier_orders o WHERE o.id = order_id AND o.driver_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.courier_orders o WHERE o.id = order_id AND o.driver_id = auth.uid()));
CREATE POLICY "admins manage stops" ON public.courier_order_stops FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_courier_orders_updated_at BEFORE UPDATE ON public.courier_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_courier_order_stops_updated_at BEFORE UPDATE ON public.courier_order_stops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_courier_orders_driver_status ON public.courier_orders(driver_id, status);
CREATE INDEX idx_courier_orders_available ON public.courier_orders(status) WHERE status = 'disponible';
CREATE INDEX idx_courier_order_stops_order ON public.courier_order_stops(order_id, sequence_number);

CREATE POLICY "drivers upload delivery proofs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'delivery-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "drivers read own delivery proofs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'delivery-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "admins read all delivery proofs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'delivery-proofs' AND public.has_role(auth.uid(), 'admin'));
