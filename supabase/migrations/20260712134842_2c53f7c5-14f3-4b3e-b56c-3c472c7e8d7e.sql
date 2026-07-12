
-- 1) Audit log table
CREATE TABLE IF NOT EXISTS public.draw_run_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  action text NOT NULL,
  draw_date date,
  status text,
  error_message text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

GRANT ALL ON public.draw_run_log TO service_role;
ALTER TABLE public.draw_run_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_only_draw_run_log" ON public.draw_run_log;
CREATE POLICY "service_only_draw_run_log" ON public.draw_run_log
  TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS draw_run_log_run_at_idx ON public.draw_run_log (run_at DESC);
CREATE INDEX IF NOT EXISTS draw_run_log_draw_date_idx ON public.draw_run_log (draw_date DESC);

-- 2) Safe wrapper: never throws, logs everything, backfills gaps
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

  -- 2a) Backfill any missing past dates as rolled_over so every calendar day
  -- has a row in daily_draws.
  SELECT COALESCE(MAX(draw_date), today_d - INTERVAL '30 days')
    INTO last_final
    FROM public.daily_draws
   WHERE status IN ('completed','rolled_over');

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

  -- 2b) Today's draw: ensure row exists, then if scheduled time passed and
  -- status still open/closed/drawing, attempt run_daily_draw and log outcome.
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
    -- Not yet time; also close cutoff opportunistically
    BEGIN PERFORM public.close_draws_for_cutoff(); EXCEPTION WHEN OTHERS THEN NULL; END;
    RETURN;
  END IF;

  -- Time to draw
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

REVOKE ALL ON FUNCTION public.run_daily_draw_safe() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_daily_draw_safe() TO service_role;

-- 3) End-of-day audit
CREATE OR REPLACE FUNCTION public.audit_missed_draws()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  today_d DATE := public.today_et();
  row public.daily_draws;
BEGIN
  SELECT * INTO row FROM public.daily_draws WHERE draw_date = today_d;
  IF row IS NULL OR row.status NOT IN ('completed','rolled_over') THEN
    -- Try one last time
    BEGIN
      PERFORM public.run_daily_draw_safe();
    EXCEPTION WHEN OTHERS THEN NULL; END;

    SELECT * INTO row FROM public.daily_draws WHERE draw_date = today_d;
    IF row IS NULL OR row.status NOT IN ('completed','rolled_over') THEN
      INSERT INTO public.draw_run_log (action, draw_date, status, error_message, details)
      VALUES ('audit_missed', today_d, 'skipped',
              'daily draw did not reach a final status before midnight',
              jsonb_build_object('current_status', COALESCE(row.status, 'no_row')));
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_missed_draws() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.audit_missed_draws() TO service_role;

-- 4) Schedule via pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Unschedule previous versions if any
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT jobname FROM cron.job
           WHERE jobname IN ('daily-draw-safe-every-10min','daily-draw-audit-2355et')
  LOOP
    PERFORM cron.unschedule(r.jobname);
  END LOOP;
END $$;

-- Every 10 min: safe runner (retries automatically until success)
SELECT cron.schedule(
  'daily-draw-safe-every-10min',
  '*/10 * * * *',
  $CRON$ SELECT public.run_daily_draw_safe(); $CRON$
);

-- 23:55 America/New_York → 03:55 UTC (EDT) / 04:55 UTC (EST). Run both to
-- guarantee coverage across DST; the function is idempotent.
SELECT cron.schedule(
  'daily-draw-audit-2355et',
  '55 3,4 * * *',
  $CRON$ SELECT public.audit_missed_draws(); $CRON$
);

-- 5) Immediate one-shot: fill visible gap in history
SELECT public.run_daily_draw_safe();
