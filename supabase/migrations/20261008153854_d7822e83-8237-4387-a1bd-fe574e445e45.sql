BEGIN;
REVOKE SELECT ON public.businesses FROM PUBLIC, anon;
DO $$ DECLARE col record; BEGIN
 FOR col IN SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='businesses' LOOP
 EXECUTE format('REVOKE SELECT (%I) ON public.businesses FROM PUBLIC, anon', col.column_name);
 END LOOP;
END $$;
GRANT SELECT (id, business_name, business_type, city, logo_url, status, created_at, slug, banner_url, descripcion, horario, zonas_que_atiende, activo, postal_code, address, stripe_environment) ON public.businesses TO anon;
GRANT SELECT, INSERT, UPDATE ON public.businesses TO authenticated;
GRANT ALL ON public.businesses TO service_role;
CREATE OR REPLACE VIEW public.approved_businesses_public WITH (security_invoker=true) AS
SELECT id, business_name, business_type, city, logo_url, status, created_at, slug, banner_url, descripcion, horario, zonas_que_atiende, activo, postal_code, address, stripe_environment
FROM public.businesses WHERE status='aprobado';
GRANT SELECT ON public.approved_businesses_public TO anon, authenticated;
GRANT ALL ON public.approved_businesses_public TO service_role;
ALTER POLICY "Users register own business" ON public.businesses WITH CHECK (
 owner_user_id=auth.uid() AND status='pendiente' AND rejection_reason IS NULL AND approved_at IS NULL AND approved_by IS NULL
 AND stripe_account_id IS NULL AND stripe_onboarding_status='none' AND stripe_payouts_enabled=false AND stripe_environment IS NULL
 AND comision_porcentaje=15
);
ALTER POLICY drivers_insert_own ON public.drivers WITH CHECK (
 id=auth.uid() AND application_status='pendiente' AND rejection_reason IS NULL AND stripe_account_id IS NULL
 AND stripe_onboarding_status='none' AND stripe_payouts_enabled=false AND stripe_environment IS NULL
);
CREATE OR REPLACE FUNCTION public.businesses_protect_admin_fields() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); is_admin boolean:=false; role_name text:=auth.role();
BEGIN
 IF role_name='service_role' OR uid IS NULL THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.status IS DISTINCT FROM 'pendiente' OR NEW.rejection_reason IS NOT NULL OR NEW.approved_at IS NOT NULL OR NEW.approved_by IS NOT NULL
    OR NEW.stripe_account_id IS NOT NULL OR NEW.stripe_onboarding_status IS DISTINCT FROM 'none' OR NEW.stripe_payouts_enabled IS DISTINCT FROM false
    OR NEW.stripe_environment IS NOT NULL OR NEW.comision_porcentaje IS DISTINCT FROM 15 THEN
   RAISE EXCEPTION 'Las postulaciones deben comenzar pendientes y sin datos internos de cobro';
  END IF;
  RETURN NEW;
 END IF;
 IF NEW.stripe_account_id IS DISTINCT FROM OLD.stripe_account_id OR NEW.stripe_onboarding_status IS DISTINCT FROM OLD.stripe_onboarding_status
  OR NEW.stripe_payouts_enabled IS DISTINCT FROM OLD.stripe_payouts_enabled OR NEW.stripe_environment IS DISTINCT FROM OLD.stripe_environment THEN
  RAISE EXCEPTION 'La cuenta de cobro solo la actualiza el sistema';
 END IF;
 is_admin:=public.has_role(uid,'admin'::public.app_role);
 IF is_admin THEN
  IF NEW.status='aprobado' AND OLD.status IS DISTINCT FROM 'aprobado' THEN
   NEW.approved_at:=COALESCE(NEW.approved_at,now()); NEW.approved_by:=COALESCE(NEW.approved_by,uid);
  END IF;
  RETURN NEW;
 END IF;
 IF NEW.status IS DISTINCT FROM OLD.status OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
 OR NEW.approved_at IS DISTINCT FROM OLD.approved_at OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
 OR NEW.comision_porcentaje IS DISTINCT FROM OLD.comision_porcentaje OR NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id THEN
  RAISE EXCEPTION 'La aprobación y configuración interna solo las cambia el administrador';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_businesses_protect_admin_fields ON public.businesses;
CREATE TRIGGER trg_businesses_protect_admin_fields BEFORE INSERT OR UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.businesses_protect_admin_fields();
CREATE OR REPLACE FUNCTION public.drivers_protect_admin_fields() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE role_name text:=auth.role();
BEGIN
 NEW.updated_at:=now();
 IF role_name='service_role' OR auth.uid() IS NULL THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.application_status IS DISTINCT FROM 'pendiente' OR NEW.rejection_reason IS NOT NULL OR NEW.stripe_account_id IS NOT NULL
   OR NEW.stripe_onboarding_status IS DISTINCT FROM 'none' OR NEW.stripe_payouts_enabled IS DISTINCT FROM false OR NEW.stripe_environment IS NOT NULL THEN
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
 IF NEW.application_status IS DISTINCT FROM OLD.application_status OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
  RAISE EXCEPTION 'La aprobación solo la cambia el administrador';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_drivers_protect ON public.drivers;
CREATE TRIGGER trg_drivers_protect BEFORE INSERT OR UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.drivers_protect_admin_fields();
REVOKE EXECUTE ON FUNCTION public.businesses_protect_admin_fields(), public.drivers_protect_admin_fields() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.businesses_protect_admin_fields(), public.drivers_protect_admin_fields() TO service_role;
CREATE OR REPLACE FUNCTION public.get_public_profiles(ids uuid[]) RETURNS TABLE(id uuid,display_name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT c.id,COALESCE(NULLIF(TRIM(SPLIT_PART(c.nombre_completo,' ',1)),''),'Usuario')
 FROM public.clientes c
 WHERE c.id=ANY(ids) AND EXISTS (SELECT 1 FROM public.reel_comments rc JOIN public.reels r ON r.id=rc.reel_id WHERE rc.user_id=c.id);
$$;
REVOKE EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO authenticated, service_role;
COMMIT;