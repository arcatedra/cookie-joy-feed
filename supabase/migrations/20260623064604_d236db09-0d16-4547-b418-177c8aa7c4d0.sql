-- 1) Restrict direct SELECT on sweepstakes_config; public callers must use the RPC
DROP POLICY IF EXISTS sweepstakes_config_public_read ON public.sweepstakes_config;

CREATE POLICY sweepstakes_config_admin_read ON public.sweepstakes_config
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Ensure the public RPC remains callable by everyone (defense-in-depth)
GRANT EXECUTE ON FUNCTION public.get_sweepstakes_public_config() TO anon, authenticated;

-- 2) Harden profiles self-update: pin sensitive columns to their current values
DROP POLICY IF EXISTS profiles_self_update ON public.profiles;

CREATE POLICY profiles_self_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id AND deleted_at IS NULL)
  WITH CHECK (
    auth.uid() = id
    AND donation_tier IS NOT DISTINCT FROM (SELECT p.donation_tier FROM public.profiles p WHERE p.id = auth.uid())
    AND stars_count   IS NOT DISTINCT FROM (SELECT p.stars_count   FROM public.profiles p WHERE p.id = auth.uid())
    AND referral_code IS NOT DISTINCT FROM (SELECT p.referral_code FROM public.profiles p WHERE p.id = auth.uid())
    AND email         IS NOT DISTINCT FROM (SELECT p.email         FROM public.profiles p WHERE p.id = auth.uid())
  );

-- 3) Revoke EXECUTE on trigger-only SECURITY DEFINER functions from end users.
--    These exist only to back triggers and must never be callable via the API.
REVOKE EXECUTE ON FUNCTION public.grant_referral_reward()             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.profiles_protect_referral_fields()  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_bulk_delete()               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.security_audit_notify()             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.soft_delete_row()                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_donation_tier_self_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_winner_via_hook()            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_delivery_day()             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at()                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.profiles_terms_consent_guard()      FROM PUBLIC, anon, authenticated;