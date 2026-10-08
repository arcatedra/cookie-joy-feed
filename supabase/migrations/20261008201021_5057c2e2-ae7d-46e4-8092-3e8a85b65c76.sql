ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS background_check_status text NOT NULL DEFAULT 'pendiente';

CREATE OR REPLACE FUNCTION public.validate_driver_background_check()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.background_check_status NOT IN ('pendiente','aprobado','rechazado') THEN
    RAISE EXCEPTION 'Estado de antecedentes no válido';
  END IF;
  IF NEW.application_status = 'aprobado' AND NEW.background_check_status <> 'aprobado'
     AND (TG_OP = 'INSERT' OR OLD.application_status IS DISTINCT FROM 'aprobado') THEN
    RAISE EXCEPTION 'No puedes aprobar a este repartidor: la revisión de antecedentes de Checkr debe estar en Aprobado.';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_driver_background_check ON public.drivers;
CREATE TRIGGER trg_validate_driver_background_check BEFORE INSERT OR UPDATE ON public.drivers
FOR EACH ROW EXECUTE FUNCTION public.validate_driver_background_check();

CREATE OR REPLACE FUNCTION public.drivers_protect_admin_fields()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE role_name text:=auth.role();
BEGIN
 NEW.updated_at:=now();
 IF role_name='service_role' OR auth.uid() IS NULL THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.application_status IS DISTINCT FROM 'pendiente' OR NEW.rejection_reason IS NOT NULL OR NEW.stripe_account_id IS NOT NULL
   OR NEW.stripe_onboarding_status IS DISTINCT FROM 'none' OR NEW.stripe_payouts_enabled IS DISTINCT FROM false OR NEW.stripe_environment IS NOT NULL
   OR NEW.background_check_status IS DISTINCT FROM 'pendiente' THEN
   RAISE EXCEPTION 'Las postulaciones deben comenzar pendientes y sin datos internos de cobro';
  END IF;
  RETURN NEW;
 END IF;
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.stripe_account_id IS DISTINCT FROM OLD.stripe_account_id
  OR NEW.stripe_onboarding_status IS DISTINCT FROM OLD.stripe_onboarding_status OR NEW.stripe_payouts_enabled IS DISTINCT FROM OLD.stripe_payouts_enabled
  OR NEW.stripe_environment IS DISTINCT FROM OLD.stripe_environment THEN
  RAISE EXCEPTION 'Estos datos solo los cambia el sistema';
 END IF;
 IF public.has_role(auth.uid(),'admin'::public.app_role) THEN RETURN NEW; END IF;
 IF NEW.application_status IS DISTINCT FROM OLD.application_status OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
  OR NEW.background_check_status IS DISTINCT FROM OLD.background_check_status THEN
  RAISE EXCEPTION 'La aprobación solo la cambia el administrador';
 END IF;
 RETURN NEW;
END $function$;