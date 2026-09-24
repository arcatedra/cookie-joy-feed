ALTER TABLE public.delivery_zones ADD COLUMN IF NOT EXISTS borough text NOT NULL DEFAULT '';
CREATE OR REPLACE FUNCTION public.validate_delivery_zone()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE dup text;
BEGIN
  NEW.updated_at := now();
  NEW.borough := trim(coalesce(NEW.borough, ''));
  NEW.zip_codes := ARRAY(SELECT DISTINCT trim(z) FROM unnest(NEW.zip_codes) z WHERE trim(z) <> '');
  IF EXISTS (SELECT 1 FROM unnest(NEW.zip_codes) z WHERE z !~ '^[0-9]{5}$') THEN
    RAISE EXCEPTION 'Cada código postal debe tener 5 dígitos';
  END IF;
  SELECT z INTO dup FROM delivery_zones dz, unnest(dz.zip_codes) z
   WHERE dz.id <> NEW.id AND z = ANY(NEW.zip_codes) LIMIT 1;
  IF dup IS NOT NULL THEN
    RAISE EXCEPTION 'El código % ya está en otra zona', dup;
  END IF;
  RETURN NEW;
END $function$;