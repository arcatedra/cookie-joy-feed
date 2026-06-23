CREATE OR REPLACE FUNCTION public.get_today_draw()
 RETURNS TABLE(draw_date date, status text, scheduled_at timestamp with time zone, prize_usd_live numeric, tickets_total integer, entrants_total integer, winner_display_name text, seed_hash text, rolled_over_from date)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  d DATE := public.today_et();
  row public.daily_draws;
  today_pool NUMERIC(12,2);
BEGIN
  SELECT * INTO row FROM public.daily_draws WHERE daily_draws.draw_date = d;

  IF NOT FOUND THEN
    SELECT COALESCE(SUM(prize_usd),0) INTO today_pool
      FROM public.daily_draws
     WHERE daily_draws.draw_date < d AND daily_draws.status = 'rolled_over'
       AND daily_draws.draw_date > COALESCE((
         SELECT MAX(dd2.draw_date) FROM public.daily_draws dd2
          WHERE dd2.draw_date < d AND dd2.status = 'completed'
       ), '1900-01-01'::date);

    RETURN QUERY SELECT
      d, 'open'::text, public.draw_time_for(d),
      (today_pool + COALESCE((
        SELECT SUM(pool_share_usd) FROM public.prize_pool_ledger
         WHERE (created_at AT TIME ZONE 'America/New_York')::date = d
      ),0))::numeric,
      0::int, 0::int, NULL::text, NULL::text, NULL::date;
    RETURN;
  END IF;

  IF row.status IN ('completed') THEN
    RETURN QUERY SELECT
      row.draw_date, row.status, row.scheduled_at,
      row.prize_usd, row.tickets_total, row.entrants_total,
      row.winner_display_name, row.seed_hash, row.rolled_over_from;
  ELSE
    RETURN QUERY SELECT
      row.draw_date, row.status, row.scheduled_at,
      (row.prize_usd + COALESCE((
        SELECT SUM(pool_share_usd) FROM public.prize_pool_ledger
         WHERE (created_at AT TIME ZONE 'America/New_York')::date = d
      ),0))::numeric,
      COALESCE((SELECT SUM(tickets)::int FROM public.daily_draw_entries WHERE daily_draw_entries.draw_date = d), 0),
      COALESCE((SELECT COUNT(*)::int FROM public.daily_draw_entries WHERE daily_draw_entries.draw_date = d), 0),
      row.winner_display_name, row.seed_hash, row.rolled_over_from;
  END IF;
END;
$function$;