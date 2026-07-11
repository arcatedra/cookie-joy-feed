
-- 1. Refuerzo anti-auto-invitación por email en handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_name TEXT := COALESCE(meta->>'name', meta->>'full_name', split_part(NEW.email, '@', 1));
  v_region TEXT := NULLIF(meta->>'region', '');
  v_terms BOOLEAN := COALESCE((meta->>'terms_accepted')::boolean, FALSE);
  v_ref_code TEXT := upper(NULLIF(meta->>'referral_code', ''));
  v_referrer UUID;
  v_referrer_email TEXT;
  v_new_code TEXT := public.generate_referral_code();
BEGIN
  INSERT INTO public.profiles (id, display_name, full_name, email, region, terms_accepted, referral_code)
  VALUES (NEW.id, v_name, v_name, NEW.email, v_region, v_terms, v_new_code)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
        region = COALESCE(public.profiles.region, EXCLUDED.region),
        terms_accepted = public.profiles.terms_accepted OR EXCLUDED.terms_accepted;

  IF v_ref_code IS NOT NULL THEN
    SELECT p.id, p.email INTO v_referrer, v_referrer_email
      FROM public.profiles p
      WHERE p.referral_code = v_ref_code AND p.deleted_at IS NULL;
    IF v_referrer IS NOT NULL
       AND v_referrer <> NEW.id
       AND lower(COALESCE(v_referrer_email, '')) <> lower(COALESCE(NEW.email, '')) THEN
      INSERT INTO public.referrals (referrer_id, referee_id)
      VALUES (v_referrer, NEW.id)
      ON CONFLICT (referee_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Historial de invitados del usuario actual (nombre público + fechas)
CREATE OR REPLACE FUNCTION public.get_my_referrals()
 RETURNS TABLE(
   referee_display_name text,
   invited_at timestamptz,
   reward_granted boolean,
   rewarded_at timestamptz
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    COALESCE(p.display_name, split_part(p.email, '@', 1), 'Amigo') AS referee_display_name,
    r.created_at AS invited_at,
    r.reward_granted,
    r.rewarded_at
  FROM public.referrals r
  LEFT JOIN public.profiles p ON p.id = r.referee_id
  WHERE r.referrer_id = auth.uid()
  ORDER BY r.created_at DESC
  LIMIT 200;
$function$;

GRANT EXECUTE ON FUNCTION public.get_my_referrals() TO authenticated;
