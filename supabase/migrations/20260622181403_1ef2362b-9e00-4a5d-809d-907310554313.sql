
-- Allow admins to update sweepstakes_config (still public read)
GRANT SELECT, UPDATE ON public.sweepstakes_config TO authenticated;
GRANT ALL ON public.sweepstakes_config TO service_role;

DROP POLICY IF EXISTS "sweepstakes_config_admin_update" ON public.sweepstakes_config;
CREATE POLICY "sweepstakes_config_admin_update"
ON public.sweepstakes_config
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Guard run_daily_draw: refuse if sponsor address still placeholder
CREATE OR REPLACE FUNCTION public.run_daily_draw()
 RETURNS TABLE(draw_date date, status text, winner_display_name text, prize_usd numeric, seed_hash text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  d DATE := public.today_et();
  row public.daily_draws;
  cfg public.sweepstakes_config;
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
  SELECT * INTO cfg FROM public.sweepstakes_config WHERE id = true;
  IF cfg.sponsor_address IS NULL
     OR length(trim(cfg.sponsor_address)) < 10
     OR cfg.sponsor_address ILIKE '%COMPLETAR%'
     OR cfg.sponsor_address ILIKE '%[%]%' THEN
    RAISE EXCEPTION 'SPONSOR_ADDRESS_NOT_CONFIGURED';
  END IF;

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
       SET status = 'rolled_over', prize_usd = live_pool, tickets_total = 0,
           entrants_total = 0, drawn_at = now(), seed_hash = seed
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
    IF acc > cursor_pos THEN winner := e; EXIT; END IF;
  END LOOP;

  UPDATE public.daily_draws
     SET status = 'completed',
         winner_subject_user_id = winner.subject_user_id,
         winner_subject_email = winner.subject_email,
         winner_display_name = winner.display_name,
         prize_usd = live_pool, tickets_total = total_tickets, entrants_total = entrants,
         drawn_at = now(), seed_hash = seed
   WHERE id = row.id;

  INSERT INTO public.winner_claims (draw_date, user_id, email, display_name, prize_usd, claim_deadline)
  VALUES (d, winner.subject_user_id, COALESCE(winner.subject_email,''), winner.display_name, live_pool,
          now() + (cfg.claim_window_days || ' days')::interval)
  ON CONFLICT (draw_date) DO NOTHING;

  INSERT INTO public.winner_announcements (draw_date, winner_display_name, prize_usd, seed_hash)
  VALUES (d, winner.display_name, live_pool, seed)
  ON CONFLICT (draw_date) DO UPDATE
    SET winner_display_name = EXCLUDED.winner_display_name,
        prize_usd = EXCLUDED.prize_usd, seed_hash = EXCLUDED.seed_hash,
        published_at = now();

  RETURN QUERY SELECT d, 'completed'::text, winner.display_name, live_pool, seed;
END;
$function$;
