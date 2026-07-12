CREATE OR REPLACE FUNCTION public.delivery_bookings_protect_status_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_name TEXT := current_setting('request.jwt.claim.role', true);
  uid UUID := auth.uid();
  is_admin BOOLEAN := FALSE;
BEGIN
  IF role_name = 'service_role' OR uid IS NULL THEN
    RETURN NEW;
  END IF;
  is_admin := public.has_role(uid, 'admin'::public.app_role);
  IF is_admin THEN RETURN NEW; END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'delivery_bookings.status is admin/driver-only';
  END IF;
  IF NEW.delivered_at IS DISTINCT FROM OLD.delivered_at THEN
    RAISE EXCEPTION 'delivery_bookings.delivered_at is admin/driver-only';
  END IF;
  IF NEW.delivered_by IS DISTINCT FROM OLD.delivered_by THEN
    RAISE EXCEPTION 'delivery_bookings.delivered_by is admin/driver-only';
  END IF;
  IF NEW.proof_photo_path IS DISTINCT FROM OLD.proof_photo_path THEN
    RAISE EXCEPTION 'delivery_bookings.proof_photo_path is admin/driver-only';
  END IF;
  IF NEW.proof_description IS DISTINCT FROM OLD.proof_description THEN
    RAISE EXCEPTION 'delivery_bookings.proof_description is admin/driver-only';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS delivery_bookings_protect_status_fields_trg ON public.delivery_bookings;
CREATE TRIGGER delivery_bookings_protect_status_fields_trg
BEFORE UPDATE ON public.delivery_bookings
FOR EACH ROW EXECUTE FUNCTION public.delivery_bookings_protect_status_fields();