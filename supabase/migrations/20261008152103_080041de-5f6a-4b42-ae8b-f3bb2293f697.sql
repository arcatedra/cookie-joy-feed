ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS postal_code text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS stripe_environment text;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS stripe_environment text;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS stripe_environment text;
CREATE OR REPLACE FUNCTION public.validate_business_postal_code() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NEW.postal_code IS NOT NULL AND NEW.postal_code !~ '^[0-9]{5}$' THEN RAISE EXCEPTION 'El código postal debe tener 5 dígitos'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER validate_business_postal_code BEFORE INSERT OR UPDATE OF postal_code ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.validate_business_postal_code();
CREATE OR REPLACE FUNCTION public.validate_stripe_environment() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NEW.stripe_environment IS NOT NULL AND NEW.stripe_environment NOT IN ('sandbox','live') THEN RAISE EXCEPTION 'Ambiente Stripe inválido'; END IF;
 IF TG_OP = 'UPDATE' AND OLD.stripe_environment IS NOT NULL AND NEW.stripe_environment IS DISTINCT FROM OLD.stripe_environment THEN RAISE EXCEPTION 'El ambiente Stripe no se puede cambiar'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER validate_business_stripe_environment BEFORE INSERT OR UPDATE OF stripe_environment ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.validate_stripe_environment();
CREATE TRIGGER validate_driver_stripe_environment BEFORE INSERT OR UPDATE OF stripe_environment ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.validate_stripe_environment();
CREATE TRIGGER validate_store_order_stripe_environment BEFORE INSERT OR UPDATE OF stripe_environment ON public.store_orders FOR EACH ROW EXECUTE FUNCTION public.validate_stripe_environment();