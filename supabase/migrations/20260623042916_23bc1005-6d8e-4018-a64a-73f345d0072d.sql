DROP FUNCTION IF EXISTS public.get_sweepstakes_public_config();

CREATE OR REPLACE FUNCTION public.get_sweepstakes_public_config()
 RETURNS TABLE(sponsor_name text, sponsor_address text, sponsor_email text, excluded_states text[], min_age integer, claim_window_days integer, entry_cutoff_minutes integer, max_daily_prize_usd numeric, address_valid boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    c.sponsor_name,
    c.sponsor_address,
    c.sponsor_email,
    c.excluded_states,
    c.min_age,
    c.claim_window_days,
    c.entry_cutoff_minutes,
    c.max_daily_prize_usd,
    (c.sponsor_address IS NOT NULL
      AND length(trim(c.sponsor_address)) >= 10
      AND c.sponsor_address NOT ILIKE '%COMPLETAR%'
      AND c.sponsor_address NOT ILIKE '%[%]%') AS address_valid
  FROM public.sweepstakes_config c
  WHERE c.id = true;
$function$;

GRANT EXECUTE ON FUNCTION public.get_sweepstakes_public_config() TO anon, authenticated;