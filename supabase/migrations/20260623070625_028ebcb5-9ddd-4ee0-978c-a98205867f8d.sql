-- 1) Reescribir run_daily_draw para no depender de winner_subject_email / winner_subject_user_id
CREATE OR REPLACE FUNCTION public.run_daily_draw()
 RETURNS TABLE(draw_date date, status text, winner_display_name text, prize_usd numeric, seed_hash text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
#variable_conflict use_column
DECLARE
  d DATE := public.today_et();
  row public.daily_draws;
  cfg public.sweepstakes_config;
  total_tickets INT := 0;
  entrants INT := 0;
  live_pool NUMERIC(12,2) := 0;
  awarded_prize NUMERIC(12,2) := 0;
  carry_excess NUMERIC(12,2) := 0;
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

  IF cfg.max_daily_prize_usd IS NOT NULL AND live_pool > cfg.max_daily_prize_usd THEN
    awarded_prize := cfg.max_daily_prize_usd;
    carry_excess := live_pool - cfg.max_daily_prize_usd;
  ELSE
    awarded_prize := live_pool;
    carry_excess := 0;
  END IF;

  SELECT COALESCE(SUM(tickets),0)::int, COUNT(*)::int
    INTO total_tickets, entrants
    FROM public.daily_draw_entries WHERE daily_draw_entries.draw_date = d;

  seed := encode(extensions.digest(d::text || '|' || total_tickets::text || '|' || gen_random_uuid()::text, 'sha256'),'hex');

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

  -- Note: winner_subject_email / winner_subject_user_id are no longer stored on daily_draws.
  -- The identity lives in winner_claims (admin-restricted RLS) and only the display name
  -- is kept on daily_draws / winner_announcements for public listings.
  UPDATE public.daily_draws
     SET status = 'completed',
         winner_display_name = winner.display_name,
         prize_usd = awarded_prize,
         tickets_total = total_tickets, entrants_total = entrants,
         drawn_at = now(), seed_hash = seed
   WHERE id = row.id;

  IF carry_excess > 0 THEN
    INSERT INTO public.daily_draws (draw_date, status, scheduled_at, prize_usd, rolled_over_from)
    VALUES (d + 1, 'open', public.draw_time_for(d + 1), carry_excess, d)
    ON CONFLICT (draw_date) DO UPDATE
      SET prize_usd = public.daily_draws.prize_usd + EXCLUDED.prize_usd,
          rolled_over_from = COALESCE(public.daily_draws.rolled_over_from, EXCLUDED.rolled_over_from);
  END IF;

  INSERT INTO public.winner_claims (draw_date, user_id, email, display_name, prize_usd, claim_deadline)
  VALUES (d, winner.subject_user_id, COALESCE(winner.subject_email,''), winner.display_name, awarded_prize,
          now() + (cfg.claim_window_days || ' days')::interval)
  ON CONFLICT (draw_date) DO NOTHING;

  INSERT INTO public.winner_announcements (draw_date, winner_display_name, prize_usd, seed_hash)
  VALUES (d, winner.display_name, awarded_prize, seed)
  ON CONFLICT (draw_date) DO UPDATE
    SET winner_display_name = EXCLUDED.winner_display_name,
        prize_usd = EXCLUDED.prize_usd, seed_hash = EXCLUDED.seed_hash,
        published_at = now();

  RETURN QUERY SELECT d, 'completed'::text, winner.display_name, awarded_prize, seed;
END;
$function$;

-- 2) Drop the redundant sensitive columns from daily_draws
ALTER TABLE public.daily_draws DROP COLUMN IF EXISTS winner_subject_email;
ALTER TABLE public.daily_draws DROP COLUMN IF EXISTS winner_subject_user_id;

-- 3) Restrict admin SECURITY DEFINER functions to service_role only.
--    They are now called from server functions via supabaseAdmin after an
--    explicit has_role('admin') gate; no signed-in user needs direct EXECUTE.
REVOKE EXECUTE ON FUNCTION public.cron_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.list_soft_deleted(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restore_row(text, uuid) FROM PUBLIC, anon, authenticated;
