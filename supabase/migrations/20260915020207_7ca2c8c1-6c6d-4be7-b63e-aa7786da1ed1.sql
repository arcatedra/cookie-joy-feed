CREATE TABLE public.driver_tax_profiles (
  driver_id uuid PRIMARY KEY,
  tax_id_type text NOT NULL,
  tax_id_ciphertext text NOT NULL,
  tax_id_iv text NOT NULL,
  tax_id_last4 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT, UPDATE ON public.driver_tax_profiles TO authenticated;
GRANT ALL ON public.driver_tax_profiles TO service_role;

ALTER TABLE public.driver_tax_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers insert own tax profile"
ON public.driver_tax_profiles FOR INSERT TO authenticated
WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Drivers update own tax profile"
ON public.driver_tax_profiles FOR UPDATE TO authenticated
USING (driver_id = auth.uid())
WITH CHECK (driver_id = auth.uid());

CREATE OR REPLACE FUNCTION public.validate_driver_tax_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.tax_id_type NOT IN ('ssn', 'itin') THEN
    RAISE EXCEPTION 'Invalid tax ID type';
  END IF;
  IF NEW.tax_id_last4 !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'Invalid tax ID last four digits';
  END IF;
  IF length(NEW.tax_id_ciphertext) > 1024 OR length(NEW.tax_id_iv) > 128 THEN
    RAISE EXCEPTION 'Invalid encrypted tax ID';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER driver_tax_profiles_validate
BEFORE INSERT OR UPDATE ON public.driver_tax_profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_driver_tax_profile();

CREATE OR REPLACE FUNCTION public.touch_driver_tax_profile_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER driver_tax_profiles_touch_updated
BEFORE UPDATE ON public.driver_tax_profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_driver_tax_profile_updated_at();