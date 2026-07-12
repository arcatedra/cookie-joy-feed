
-- 1) Purge the "Prueba" test record from production
DELETE FROM public.winner_claims WHERE draw_date = '2026-06-22';
DELETE FROM public.winner_announcements WHERE draw_date = '2026-06-22' AND winner_display_name = 'Prueba';

UPDATE public.daily_draws
   SET status = 'rolled_over',
       winner_display_name = NULL,
       prize_usd = 0,
       tickets_total = 0,
       entrants_total = 0
 WHERE draw_date = '2026-06-22';

-- 2) Reserved-name validation for public winner records
CREATE OR REPLACE FUNCTION public.block_reserved_winner_names()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  normalized TEXT;
  reserved   TEXT[] := ARRAY['prueba','test','demo','qa','dummy','ejemplo','sample','testing','pruebas'];
BEGIN
  IF NEW.winner_display_name IS NULL THEN
    RETURN NEW;
  END IF;

  normalized := lower(btrim(NEW.winner_display_name));

  IF normalized = ANY(reserved) THEN
    RAISE EXCEPTION 'RESERVED_WINNER_NAME: "%" is a reserved test keyword and cannot be stored as a public winner.', NEW.winner_display_name
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_reserved_winner_names_wa ON public.winner_announcements;
CREATE TRIGGER trg_block_reserved_winner_names_wa
BEFORE INSERT OR UPDATE ON public.winner_announcements
FOR EACH ROW EXECUTE FUNCTION public.block_reserved_winner_names();

DROP TRIGGER IF EXISTS trg_block_reserved_winner_names_dd ON public.daily_draws;
CREATE TRIGGER trg_block_reserved_winner_names_dd
BEFORE INSERT OR UPDATE ON public.daily_draws
FOR EACH ROW EXECUTE FUNCTION public.block_reserved_winner_names();
