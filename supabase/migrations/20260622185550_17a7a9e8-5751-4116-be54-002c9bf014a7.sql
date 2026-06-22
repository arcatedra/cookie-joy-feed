
-- 1) Add prize cap column
ALTER TABLE public.sweepstakes_config
  ADD COLUMN IF NOT EXISTS max_daily_prize_usd NUMERIC(12,2) NOT NULL DEFAULT 4999.00;

-- 2) Guard enter_daily_draw: refuse if sponsor address still placeholder
CREATE OR REPLACE FUNCTION public.enter_daily_draw(p_user_id uuid, p_email text, p_display_name text, p_tickets integer, p_cost_per_ticket integer DEFAULT 10)
 RETURNS TABLE(new_balance integer, tickets_added integer, entry_id uuid)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  d DATE := public.today_et();
  row public.daily_draws;
  tk RECORD;
  cost INT := p_tickets * p_cost_per_ticket;
  ent public.daily_draw_entries;
  cfg public.sweepstakes_config;
  cutoff TIMESTAMPTZ;
BEGIN
  IF p_tickets < 1 OR p_tickets > 100 THEN RAISE EXCEPTION 'INVALID_TICKETS'; END IF;
  IF p_user_id IS NULL AND (p_email IS NULL OR length(p_email) = 0) THEN
    RAISE EXCEPTION 'NO_SUBJECT';
  END IF;

  SELECT * INTO cfg FROM public.sweepstakes_config WHERE id = true;

  -- Block entries while official rules are not finalized (sponsor address required by law)
  IF cfg.sponsor_address IS NULL
     OR length(trim(cfg.sponsor_address)) < 10
     OR cfg.sponsor_address ILIKE '%COMPLETAR%'
     OR cfg.sponsor_address ILIKE '%[%]%' THEN
    RAISE EXCEPTION 'SPONSOR_ADDRESS_NOT_CONFIGURED';
  END IF;

  PERFORM public.ensure_today_draw();
  SELECT * INTO row FROM public.daily_draws WHERE daily_draws.draw_date = d FOR UPDATE;
  cutoff := row.scheduled_at - (cfg.entry_cutoff_minutes || ' minutes')::interval;
  IF row.status <> 'open' OR now() >= cutoff THEN RAISE EXCEPTION 'DRAW_CLOSED'; END IF;

  IF p_user_id IS NOT NULL THEN
    SELECT * INTO tk FROM public.user_tokens WHERE user_id = p_user_id FOR UPDATE;
  ELSE
    SELECT * INTO tk FROM public.user_tokens WHERE lower(guest_email) = lower(p_email) FOR UPDATE;
  END IF;
  IF NOT FOUND OR tk.balance < cost THEN RAISE EXCEPTION 'INSUFFICIENT_STARS'; END IF;

  UPDATE public.user_tokens SET balance = balance - cost WHERE id = tk.id;

  INSERT INTO public.daily_draw_entries (draw_date, subject_user_id, subject_email, display_name, tickets, source)
  VALUES (d, p_user_id, lower(p_email), COALESCE(NULLIF(trim(p_display_name),''),'Anónimo'), p_tickets, 'paid')
  RETURNING * INTO ent;

  RETURN QUERY SELECT (tk.balance - cost)::int, p_tickets, ent.id;
END;
$function$;

-- 3) Guard submit_amoe_entry similarly
CREATE OR REPLACE FUNCTION public.submit_amoe_entry(p_user_id uuid, p_email text, p_full_name text, p_address1 text, p_address2 text, p_city text, p_state text, p_zip text, p_dob date, p_phone text, p_essay text, p_ip inet, p_user_agent text)
 RETURNS TABLE(amoe_id uuid, entry_id uuid, draw_date date)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  cfg public.sweepstakes_config;
  d DATE := public.today_et();
  drow public.daily_draws;
  amoe_id_v UUID;
  entry_id_v UUID;
  age_years INT;
  cutoff TIMESTAMPTZ;
  ip_count INT;
BEGIN
  SELECT * INTO cfg FROM public.sweepstakes_config WHERE id = true;

  -- Block AMOE while official rules are not finalized
  IF cfg.sponsor_address IS NULL
     OR length(trim(cfg.sponsor_address)) < 10
     OR cfg.sponsor_address ILIKE '%COMPLETAR%'
     OR cfg.sponsor_address ILIKE '%[%]%' THEN
    RAISE EXCEPTION 'SPONSOR_ADDRESS_NOT_CONFIGURED';
  END IF;

  IF p_email IS NULL OR length(trim(p_email)) = 0 THEN RAISE EXCEPTION 'EMAIL_REQUIRED'; END IF;
  IF p_full_name IS NULL OR length(trim(p_full_name)) < 2 THEN RAISE EXCEPTION 'NAME_REQUIRED'; END IF;
  IF p_address1 IS NULL OR p_city IS NULL OR p_state IS NULL OR p_zip IS NULL
     THEN RAISE EXCEPTION 'ADDRESS_REQUIRED'; END IF;
  IF p_dob IS NULL THEN RAISE EXCEPTION 'DOB_REQUIRED'; END IF;
  IF length(coalesce(p_essay,'')) < 100 THEN RAISE EXCEPTION 'ESSAY_TOO_SHORT'; END IF;

  age_years := EXTRACT(YEAR FROM age(p_dob))::INT;
  IF age_years < cfg.min_age THEN RAISE EXCEPTION 'UNDERAGE'; END IF;

  IF upper(p_state) = ANY(cfg.excluded_states) THEN RAISE EXCEPTION 'STATE_EXCLUDED'; END IF;

  PERFORM public.ensure_today_draw();
  SELECT * INTO drow FROM public.daily_draws WHERE daily_draws.draw_date = d FOR UPDATE;
  cutoff := drow.scheduled_at - (cfg.entry_cutoff_minutes || ' minutes')::interval;
  IF drow.status <> 'open' OR now() >= cutoff THEN
    RAISE EXCEPTION 'DRAW_CLOSED';
  END IF;

  IF p_ip IS NOT NULL THEN
    SELECT COUNT(*) INTO ip_count
      FROM public.amoe_entries
     WHERE ip = p_ip AND amoe_entries.draw_date = d;
    IF ip_count >= 3 THEN RAISE EXCEPTION 'IP_LIMIT'; END IF;
  END IF;

  BEGIN
    INSERT INTO public.amoe_entries (
      user_id, email, full_name, phone, essay, ip,
      address1, address2, city, state, zip, dob, draw_date, source, user_agent
    ) VALUES (
      p_user_id, lower(p_email), p_full_name, COALESCE(p_phone,''), p_essay, p_ip,
      p_address1, p_address2, p_city, upper(p_state), p_zip, p_dob, d, 'web', p_user_agent
    ) RETURNING id INTO amoe_id_v;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'ALREADY_ENTERED_TODAY';
  END;

  INSERT INTO public.daily_draw_entries (
    draw_date, subject_user_id, subject_email, display_name, tickets, source
  ) VALUES (
    d, p_user_id, lower(p_email), COALESCE(NULLIF(trim(p_full_name),''),'Anónimo'), 1, 'amoe'
  ) RETURNING id INTO entry_id_v;

  UPDATE public.amoe_entries SET draw_entry_id = entry_id_v WHERE id = amoe_id_v;

  RETURN QUERY SELECT amoe_id_v, entry_id_v, d;
END;
$function$;

-- 4) Apply daily prize cap in run_daily_draw (excess carries to next day's pool)
CREATE OR REPLACE FUNCTION public.run_daily_draw()
 RETURNS TABLE(draw_date date, status text, winner_display_name text, prize_usd numeric, seed_hash text)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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

  -- Cap awarded prize; carry excess to tomorrow as rollover seed
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
         prize_usd = awarded_prize,
         tickets_total = total_tickets, entrants_total = entrants,
         drawn_at = now(), seed_hash = seed
   WHERE id = row.id;

  -- If we capped the prize, seed tomorrow's draw with the excess as carry-over
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

-- 5) Public RPC to expose sponsor info safely (read-only, no PII)
CREATE OR REPLACE FUNCTION public.get_sweepstakes_public_config()
RETURNS TABLE(
  sponsor_name TEXT,
  sponsor_address TEXT,
  sponsor_email TEXT,
  excluded_states TEXT[],
  min_age INT,
  claim_window_days INT,
  max_daily_prize_usd NUMERIC,
  address_valid BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    c.sponsor_name,
    c.sponsor_address,
    c.sponsor_email,
    c.excluded_states,
    c.min_age,
    c.claim_window_days,
    c.max_daily_prize_usd,
    (c.sponsor_address IS NOT NULL
      AND length(trim(c.sponsor_address)) >= 10
      AND c.sponsor_address NOT ILIKE '%COMPLETAR%'
      AND c.sponsor_address NOT ILIKE '%[%]%') AS address_valid
  FROM public.sweepstakes_config c
  WHERE c.id = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_sweepstakes_public_config() TO anon, authenticated;
