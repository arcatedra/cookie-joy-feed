
-- 1) Table
CREATE TABLE IF NOT EXISTS public.winner_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  draw_date DATE NOT NULL UNIQUE,
  winner_display_name TEXT NOT NULL,
  prize_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  seed_hash TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Grants
GRANT SELECT ON public.winner_announcements TO anon, authenticated;
GRANT ALL ON public.winner_announcements TO service_role;

-- 3) RLS
ALTER TABLE public.winner_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "winner_announcements_public_read" ON public.winner_announcements;
CREATE POLICY "winner_announcements_public_read"
  ON public.winner_announcements FOR SELECT
  TO anon, authenticated
  USING (true);

-- 4) Public RPC to list recent winners (feed)
CREATE OR REPLACE FUNCTION public.get_winner_announcements(p_limit INTEGER DEFAULT 10)
RETURNS TABLE(draw_date DATE, winner_display_name TEXT, prize_usd NUMERIC, seed_hash TEXT, published_at TIMESTAMPTZ)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT w.draw_date, w.winner_display_name, w.prize_usd, w.seed_hash, w.published_at
    FROM public.winner_announcements w
   ORDER BY w.draw_date DESC
   LIMIT GREATEST(LEAST(p_limit, 50), 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_winner_announcements(INTEGER) TO anon, authenticated;

-- 5) Update run_daily_draw to publish the winner to the feed
CREATE OR REPLACE FUNCTION public.run_daily_draw()
 RETURNS TABLE(draw_date date, status text, winner_display_name text, prize_usd numeric, seed_hash text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  d DATE := public.today_et();
  row public.daily_draws;
  total_tickets INT := 0;
  entrants INT := 0;
  live_pool NUMERIC(12,2) := 0;
  seed TEXT;
  seed_int BIGINT;
  cursor_pos BIGINT;
  acc BIGINT := 0;
  winner public.daily_draw_entries;
  e RECORD;
BEGIN
  PERFORM public.ensure_today_draw();
  SELECT * INTO row FROM public.daily_draws WHERE daily_draws.draw_date = d FOR UPDATE;

  IF row.status IN ('completed','rolled_over') THEN
    RETURN QUERY SELECT row.draw_date, row.status, row.winner_display_name, row.prize_usd, row.seed_hash;
    RETURN;
  END IF;

  UPDATE public.daily_draws SET status = 'drawing' WHERE id = row.id;

  SELECT COALESCE(SUM(pool_share_usd),0) INTO live_pool FROM public.prize_pool_ledger
   WHERE (created_at AT TIME ZONE 'America/New_York')::date = d;
  live_pool := live_pool + row.prize_usd;

  SELECT COALESCE(SUM(tickets),0)::int, COUNT(*)::int
    INTO total_tickets, entrants
    FROM public.daily_draw_entries WHERE daily_draw_entries.draw_date = d;

  seed := encode(digest(d::text || '|' || total_tickets::text || '|' || gen_random_uuid()::text, 'sha256'),'hex');

  IF total_tickets = 0 THEN
    UPDATE public.daily_draws
       SET status = 'rolled_over',
           prize_usd = live_pool,
           tickets_total = 0,
           entrants_total = 0,
           drawn_at = now(),
           seed_hash = seed
     WHERE id = row.id;

    RETURN QUERY SELECT d, 'rolled_over'::text, NULL::text, live_pool, seed;
    RETURN;
  END IF;

  seed_int := ('x' || substr(seed,1,15))::bit(60)::bigint;
  cursor_pos := (abs(seed_int) % total_tickets);

  FOR e IN
    SELECT * FROM public.daily_draw_entries
     WHERE daily_draw_entries.draw_date = d
     ORDER BY created_at ASC, id ASC
  LOOP
    acc := acc + e.tickets;
    IF acc > cursor_pos THEN
      winner := e;
      EXIT;
    END IF;
  END LOOP;

  UPDATE public.daily_draws
     SET status = 'completed',
         winner_subject_user_id = winner.subject_user_id,
         winner_subject_email = winner.subject_email,
         winner_display_name = winner.display_name,
         prize_usd = live_pool,
         tickets_total = total_tickets,
         entrants_total = entrants,
         drawn_at = now(),
         seed_hash = seed
   WHERE id = row.id;

  -- Publish to Reels feed (idempotent)
  INSERT INTO public.winner_announcements (draw_date, winner_display_name, prize_usd, seed_hash)
  VALUES (d, winner.display_name, live_pool, seed)
  ON CONFLICT (draw_date) DO UPDATE
    SET winner_display_name = EXCLUDED.winner_display_name,
        prize_usd = EXCLUDED.prize_usd,
        seed_hash = EXCLUDED.seed_hash,
        published_at = now();

  RETURN QUERY SELECT d, 'completed'::text, winner.display_name, live_pool, seed;
END;
$function$;
