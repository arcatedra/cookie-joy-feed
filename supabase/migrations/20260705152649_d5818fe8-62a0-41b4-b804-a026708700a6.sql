-- Add 'repartidor' role to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'repartidor';

-- Enums for driver domain
DO $$ BEGIN
  CREATE TYPE public.driver_application_status AS ENUM ('pendiente','en_revision','aprobado','rechazado','suspendido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.driver_vehicle_type AS ENUM ('bicicleta','moto','auto','a_pie');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.driver_document_type AS ENUM ('licencia_conducir','seguro_vehiculo','identificacion','antecedentes_penales','foto_perfil');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.driver_document_status AS ENUM ('pendiente','aprobado','rechazado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.driver_earnings_status AS ENUM ('pendiente','pagado','en_proceso');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================
-- 1) drivers
-- =========================================================
CREATE TABLE public.drivers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  profile_photo_url TEXT,
  application_status public.driver_application_status NOT NULL DEFAULT 'pendiente',
  rejection_reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT drivers_adult_check CHECK (date_of_birth <= (CURRENT_DATE - INTERVAL '18 years'))
);

GRANT SELECT, INSERT, UPDATE ON public.drivers TO authenticated;
GRANT ALL ON public.drivers TO service_role;

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Driver can view own row" ON public.drivers
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Driver can insert own row" ON public.drivers
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Driver can update own row" ON public.drivers
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- Prevent drivers from self-approving: only admins/service_role can change application_status, is_active, rejection_reason, approval bookkeeping
CREATE OR REPLACE FUNCTION public.drivers_protect_admin_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  role_name TEXT := current_setting('request.jwt.claim.role', true);
  is_admin BOOLEAN := FALSE;
  uid UUID := auth.uid();
BEGIN
  IF role_name = 'service_role' OR uid IS NULL THEN
    RETURN NEW;
  END IF;
  IF uid IS NOT NULL THEN
    is_admin := public.has_role(uid, 'admin'::public.app_role);
  END IF;
  IF is_admin THEN RETURN NEW; END IF;

  IF NEW.application_status IS DISTINCT FROM OLD.application_status THEN
    RAISE EXCEPTION 'drivers.application_status is admin-only';
  END IF;
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    -- Allow driver to toggle themselves inactive but not active if not approved
    IF NEW.is_active = TRUE AND OLD.application_status <> 'aprobado' THEN
      RAISE EXCEPTION 'Cannot activate an unapproved driver';
    END IF;
  END IF;
  IF NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
    RAISE EXCEPTION 'drivers.rejection_reason is admin-only';
  END IF;
  IF NEW.approved_at IS DISTINCT FROM OLD.approved_at
     OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
     OR NEW.rejected_at IS DISTINCT FROM OLD.rejected_at
     OR NEW.rejected_by IS DISTINCT FROM OLD.rejected_by THEN
    RAISE EXCEPTION 'drivers approval bookkeeping is admin-only';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER drivers_protect_admin_fields
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.drivers_protect_admin_fields();

CREATE TRIGGER drivers_touch_updated
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- 2) driver_vehicles
-- =========================================================
CREATE TABLE public.driver_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  vehicle_type public.driver_vehicle_type NOT NULL,
  brand TEXT,
  model TEXT,
  year INT,
  plate_number TEXT,
  vehicle_photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX driver_vehicles_one_per_driver ON public.driver_vehicles(driver_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_vehicles TO authenticated;
GRANT ALL ON public.driver_vehicles TO service_role;

ALTER TABLE public.driver_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Driver manages own vehicle" ON public.driver_vehicles
  FOR ALL TO authenticated
  USING (auth.uid() = driver_id OR public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (auth.uid() = driver_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER driver_vehicles_touch_updated
  BEFORE UPDATE ON public.driver_vehicles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- 3) driver_documents
-- =========================================================
CREATE TABLE public.driver_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  document_type public.driver_document_type NOT NULL,
  file_url TEXT NOT NULL,
  status public.driver_document_status NOT NULL DEFAULT 'pendiente',
  rejection_reason TEXT,
  expiration_date DATE,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX driver_documents_driver ON public.driver_documents(driver_id);
CREATE INDEX driver_documents_status ON public.driver_documents(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_documents TO authenticated;
GRANT ALL ON public.driver_documents TO service_role;

ALTER TABLE public.driver_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Driver views own documents" ON public.driver_documents
  FOR SELECT TO authenticated
  USING (auth.uid() = driver_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Driver inserts own documents" ON public.driver_documents
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Driver updates own documents (limited)" ON public.driver_documents
  FOR UPDATE TO authenticated
  USING (auth.uid() = driver_id OR public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (auth.uid() = driver_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Driver deletes own pending documents" ON public.driver_documents
  FOR DELETE TO authenticated
  USING ((auth.uid() = driver_id AND status = 'pendiente') OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- Prevent drivers from self-approving documents
CREATE OR REPLACE FUNCTION public.driver_documents_protect_review_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  role_name TEXT := current_setting('request.jwt.claim.role', true);
  is_admin BOOLEAN := FALSE;
  uid UUID := auth.uid();
BEGIN
  IF role_name = 'service_role' OR uid IS NULL THEN RETURN NEW; END IF;
  IF uid IS NOT NULL THEN is_admin := public.has_role(uid, 'admin'::public.app_role); END IF;
  IF is_admin THEN RETURN NEW; END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Driver replacing a rejected doc resets to pendiente
    IF NEW.status <> 'pendiente' THEN
      RAISE EXCEPTION 'driver_documents.status is admin-only';
    END IF;
  END IF;
  IF NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
     OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN
    RAISE EXCEPTION 'driver_documents review fields are admin-only';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER driver_documents_protect_review
  BEFORE UPDATE ON public.driver_documents
  FOR EACH ROW EXECUTE FUNCTION public.driver_documents_protect_review_fields();

CREATE TRIGGER driver_documents_touch_updated
  BEFORE UPDATE ON public.driver_documents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- 4) driver_earnings
-- =========================================================
CREATE TABLE public.driver_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_deliveries INT NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status public.driver_earnings_status NOT NULL DEFAULT 'pendiente',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX driver_earnings_driver ON public.driver_earnings(driver_id, period_start DESC);

GRANT SELECT ON public.driver_earnings TO authenticated;
GRANT ALL ON public.driver_earnings TO service_role;

ALTER TABLE public.driver_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Driver views own earnings" ON public.driver_earnings
  FOR SELECT TO authenticated
  USING (auth.uid() = driver_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER driver_earnings_touch_updated
  BEFORE UPDATE ON public.driver_earnings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- Helper: is_driver_approved()
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_driver_approved(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.drivers
    WHERE id = _user_id AND application_status = 'aprobado'
  );
$$;

-- =========================================================
-- Storage RLS for driver-documents bucket
-- (bucket is created via the storage_create_bucket tool)
-- Files are stored under <driver_id>/<filename>
-- =========================================================
CREATE POLICY "Drivers upload to own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'driver-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Drivers read own driver-documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'driver-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

CREATE POLICY "Drivers update own driver-documents" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'driver-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Drivers delete own driver-documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'driver-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );