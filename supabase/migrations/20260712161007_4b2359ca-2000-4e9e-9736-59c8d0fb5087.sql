CREATE OR REPLACE FUNCTION public.get_my_referral_profile()
RETURNS TABLE(
  referral_code text,
  stars_count integer,
  invited_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    p.referral_code,
    COALESCE(p.stars_count, 0)::integer AS stars_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.referrals r
      WHERE r.referrer_id = auth.uid()
    ) AS invited_count
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.deleted_at IS NULL
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.get_my_referral_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_referral_profile() TO authenticated;