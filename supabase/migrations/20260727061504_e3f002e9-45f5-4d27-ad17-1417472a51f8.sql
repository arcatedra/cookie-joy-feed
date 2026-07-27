-- Remove referral-stars reward mechanism. Keep referrals table + referral_code intact for future affiliate system.
DROP FUNCTION IF EXISTS public.grant_referral_reward_on_entry() CASCADE;
DROP FUNCTION IF EXISTS public.grant_referral_reward() CASCADE;

-- Rewrite get_my_referral_profile so it no longer counts stars from referrals.
CREATE OR REPLACE FUNCTION public.get_my_referral_profile()
RETURNS TABLE(referral_code text, stars_count integer, invited_count integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_code TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT p.referral_code INTO v_code FROM public.profiles p WHERE p.id = v_uid;

  IF v_code IS NULL THEN
    v_code := public.generate_referral_code();
    INSERT INTO public.profiles (id, referral_code)
    VALUES (v_uid, v_code)
    ON CONFLICT (id) DO UPDATE SET referral_code = COALESCE(public.profiles.referral_code, EXCLUDED.referral_code)
    RETURNING public.profiles.referral_code INTO v_code;
  END IF;

  RETURN QUERY
  SELECT
    v_code,
    0,
    COALESCE((SELECT COUNT(*)::int FROM public.referrals r WHERE r.referrer_id = v_uid), 0);
END;
$function$;