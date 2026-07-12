
CREATE OR REPLACE FUNCTION public.run_daily_draw_safe()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  today_d DATE := public.today_et();
  last_final DATE;
  d DATE;
  row public.daily_draws;
  cfg public.sweepstakes_config;
  result RECORD;
BEGIN
  SELECT * INTO cfg FROM public.sweepstakes_config WHERE id = true;

  SELECT COALESCE(MAX(draw_date), today_d - INTERVAL '30 days')
    INTO last_final
    FROM public.daily_draws
   WHERE status IN ('completed','rolled_over')
     AND draw_date < today_d;

  FOR d IN
    SELECT gs::date
      FROM generate_series(GREATEST(last_final + 1, today_d - 30), today_d - 1, INTERVAL '1 day') AS gs
  LOOP
    BEGIN
      INSERT INTO public.daily_draws (draw_date, status, scheduled_at, prize_usd, tickets_total, entrants_total)
      VALUES (d, 'rolled_over', public.draw_time_for(d), 0, 0, 0)
      ON CONFLICT (draw_date) DO UPDATE
        SET status = CASE
                       WHEN public.daily_draws.status IN ('completed','rolled_over')
                         THEN public.daily_draws.status
                       ELSE 'rolled_over'
                     END;

      INSERT INTO public.draw_run_log (action, draw_date, status, details)
      VALUES ('backfill_missed', d, 'rolled_over',
              jsonb_build_object('reason', 'no_run_recorded_for_date'));
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.draw_run_log (action, draw_date, status, error_message)
      VALUES ('backfill_missed', d, 'error', SQLERRM);
    END;
  END LOOP;

  BEGIN
    PERFORM public.ensure_today_draw();
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.draw_run_log (action, draw_date, status, error_message)
    VALUES ('ensure_today', today_d, 'error', SQLERRM);
    RETURN;
  END;

  SELECT * INTO row FROM public.daily_draws WHERE draw_date = today_d;
  IF row IS NULL THEN
    INSERT INTO public.draw_run_log (action, draw_date, status, error_message)
    VALUES ('ensure_today', today_d, 'error', 'no_row_after_ensure');
    RETURN;
  END IF;

  IF row.status IN ('completed','rolled_over') THEN
    RETURN;
  END IF;

  IF now() < row.scheduled_at THEN
    BEGIN PERFORM public.close_draws_for_cutoff(); EXCEPTION WHEN OTHERS THEN NULL; END;
    RETURN;
  END IF;

  BEGIN
    PERFORM public.close_draws_for_cutoff();
    SELECT * INTO result FROM public.run_daily_draw();
    INSERT INTO public.draw_run_log (action, draw_date, status, details)
    VALUES ('run_daily_draw', today_d, COALESCE(result.status, 'unknown'),
            jsonb_build_object('winner', result.winner_display_name,
                               'prize_usd', result.prize_usd,
                               'seed_hash', result.seed_hash));
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.draw_run_log (action, draw_date, status, error_message)
    VALUES ('run_daily_draw', today_d, 'error', SQLERRM);
  END;
END;
$$;

SELECT public.run_daily_draw_safe();
