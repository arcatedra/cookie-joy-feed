
-- Backfill missing seed_hash on rolled_over/completed empty draws, and ensure
-- run_daily_draw_safe always publishes a seed_hash when it backfills an empty day.

UPDATE public.daily_draws
   SET seed_hash = encode(
         extensions.digest(draw_date::text || '|0|backfill', 'sha256'),
         'hex'
       )
 WHERE seed_hash IS NULL
   AND status IN ('rolled_over','completed');

CREATE OR REPLACE FUNCTION public.run_daily_draw_safe()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  today_d DATE := public.today_et();
  last_final DATE;
  d DATE;
  row public.daily_draws;
  cfg public.sweepstakes_config;
  got_lock BOOLEAN;
  backfill_seed TEXT;
BEGIN
  got_lock := pg_try_advisory_xact_lock(hashtextextended('run_daily_draw_safe', 0));
  IF NOT got_lock THEN
    INSERT INTO public.draw_run_log (action, draw_date, status, details)
    VALUES ('run_daily_draw_safe', today_d, 'skipped_concurrent',
            jsonb_build_object('reason', 'another run in progress'));
    RETURN;
  END IF;

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
      backfill_seed := encode(
        extensions.digest(d::text || '|0|backfill', 'sha256'),
        'hex'
      );

      INSERT INTO public.daily_draws (draw_date, status, scheduled_at, prize_usd, tickets_total, entrants_total, seed_hash, drawn_at)
      VALUES (d, 'rolled_over', public.draw_time_for(d), 0, 0, 0, backfill_seed, now())
      ON CONFLICT (draw_date) DO UPDATE
        SET status = CASE
                       WHEN public.daily_draws.status IN ('completed','rolled_over')
                         THEN public.daily_draws.status
                       ELSE 'rolled_over'
                     END,
            seed_hash = COALESCE(public.daily_draws.seed_hash, EXCLUDED.seed_hash);

      IF NOT EXISTS (
        SELECT 1 FROM public.draw_run_log
         WHERE action = 'backfill_missed' AND draw_date = d
      ) THEN
        INSERT INTO public.draw_run_log (action, draw_date, status, details)
        VALUES ('backfill_missed', d, 'rolled_over',
                jsonb_build_object('reason', 'no_run_recorded_for_date'));
      END IF;
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
    PERFORM public.run_daily_draw();
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.draw_run_log (action, draw_date, status, error_message)
    VALUES ('run_daily_draw', today_d, 'error', SQLERRM);
  END;
END;
$function$;
