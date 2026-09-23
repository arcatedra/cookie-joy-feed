
CREATE TABLE IF NOT EXISTS public.drivers (
  id uuid PRIMARY KEY,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  date_of_birth date,
  address text,
  city text,
  work_zone text,
  profile_photo_url text,
  application_status text NOT NULL DEFAULT 'pendiente',
  rejection_reason text,
  stripe_account_id text,
  stripe_onboarding_status text NOT NULL DEFAULT 'none',
  stripe_payouts_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.drivers TO authenticated;
GRANT ALL ON public.drivers TO service_role;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drivers_select_own_or_admin" ON public.drivers FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "drivers_insert_own" ON public.drivers FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "drivers_update_own_or_admin" ON public.drivers FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.drivers_protect_admin_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  role_name text := current_setting('request.jwt.claim.role', true);
BEGIN
  NEW.updated_at := now();
  IF role_name = 'service_role' OR auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN RETURN NEW; END IF;
  IF NEW.application_status IS DISTINCT FROM OLD.application_status
     OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
     OR NEW.stripe_account_id IS DISTINCT FROM OLD.stripe_account_id
     OR NEW.stripe_onboarding_status IS DISTINCT FROM OLD.stripe_onboarding_status
     OR NEW.stripe_payouts_enabled IS DISTINCT FROM OLD.stripe_payouts_enabled THEN
    RAISE EXCEPTION 'Estos datos solo los cambia el sistema';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_drivers_protect BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.drivers_protect_admin_fields();

CREATE OR REPLACE FUNCTION public.validate_driver_application()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.application_status NOT IN ('pendiente','aprobado','rechazado','suspendido') THEN
    RAISE EXCEPTION 'estado de solicitud invalido';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_drivers_validate BEFORE INSERT OR UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.validate_driver_application();

CREATE TABLE IF NOT EXISTS public.driver_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  vehicle_type text NOT NULL,
  plate_number text,
  insurer text,
  license_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_driver_vehicles_driver ON public.driver_vehicles(driver_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_vehicles TO authenticated;
GRANT ALL ON public.driver_vehicles TO service_role;
ALTER TABLE public.driver_vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "driver_vehicles_own_or_admin" ON public.driver_vehicles FOR ALL TO authenticated
  USING (driver_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (driver_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.driver_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_driver_documents_driver ON public.driver_documents(driver_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_documents TO authenticated;
GRANT ALL ON public.driver_documents TO service_role;
ALTER TABLE public.driver_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "driver_documents_own_or_admin" ON public.driver_documents FOR ALL TO authenticated
  USING (driver_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (driver_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.driver_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  tier_amount_usd numeric NOT NULL DEFAULT 0,
  weight_amount_usd numeric NOT NULL DEFAULT 0,
  tip_amount_usd numeric NOT NULL DEFAULT 0,
  amount_usd numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendiente',
  transfer_id text,
  last_error text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);
CREATE INDEX IF NOT EXISTS idx_driver_payouts_driver ON public.driver_payouts(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_payouts_status ON public.driver_payouts(status);
GRANT SELECT ON public.driver_payouts TO authenticated;
GRANT ALL ON public.driver_payouts TO service_role;
ALTER TABLE public.driver_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "driver_payouts_select_own_or_admin" ON public.driver_payouts FOR SELECT TO authenticated
  USING (driver_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_driver_vehicles_updated BEFORE UPDATE ON public.driver_vehicles
  FOR EACH ROW EXECUTE FUNCTION public.touch_businesses_updated_at();
CREATE TRIGGER trg_driver_payouts_updated BEFORE UPDATE ON public.driver_payouts
  FOR EACH ROW EXECUTE FUNCTION public.touch_businesses_updated_at();

INSERT INTO public.pricing_settings (key, value)
VALUES ('processing_fee_pct', 3)
ON CONFLICT (key) DO NOTHING;
