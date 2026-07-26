CREATE OR REPLACE FUNCTION public.generate_referral_code()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  out TEXT;
  i INT;
  attempts INT := 0;
BEGIN
  LOOP
    out := '';
    FOR i IN 1..8 LOOP
      out := out || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = out);
    attempts := attempts + 1;
    IF attempts > 10 THEN
      out := out || substr(md5(random()::text || clock_timestamp()::text), 1, 4);
      EXIT;
    END IF;
  END LOOP;
  RETURN out;
END;
$function$;