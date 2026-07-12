
ALTER TABLE public.sweepstakes_config
  ADD COLUMN IF NOT EXISTS sweepstakes_active BOOLEAN NOT NULL DEFAULT false;

DROP FUNCTION IF EXISTS public.get_sweepstakes_public_config();

CREATE FUNCTION public.get_sweepstakes_public_config()
 RETURNS TABLE(sponsor_name text, sponsor_address text, sponsor_email text, excluded_states text[], min_age integer, claim_window_days integer, entry_cutoff_minutes integer, max_daily_prize_usd numeric, address_valid boolean, sweepstakes_active boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    c.sponsor_name,
    c.sponsor_address,
    c.sponsor_email,
    c.excluded_states,
    c.min_age,
    c.claim_window_days,
    c.entry_cutoff_minutes,
    c.max_daily_prize_usd,
    (c.sponsor_address IS NOT NULL
      AND length(trim(c.sponsor_address)) >= 10
      AND c.sponsor_address NOT ILIKE '%COMPLETAR%'
      AND c.sponsor_address NOT ILIKE '%[%]%') AS address_valid,
    c.sweepstakes_active
  FROM public.sweepstakes_config c
  WHERE c.id = true;
$function$;

GRANT EXECUTE ON FUNCTION public.get_sweepstakes_public_config() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.enter_daily_draw(p_user_id uuid, p_email text, p_display_name text, p_tickets integer, p_cost_per_ticket integer DEFAULT 10)
 RETURNS TABLE(new_balance integer, tickets_added integer, entry_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  d DATE := public.today_et();
  row public.daily_draws;
  tk RECORD;
  cost INT := p_tickets * p_cost_per_ticket;
  ent public.daily_draw_entries;
  cfg public.sweepstakes_config;
  cutoff TIMESTAMPTZ;
  v_terms BOOLEAN;
BEGIN
  IF p_tickets < 1 OR p_tickets > 100 THEN RAISE EXCEPTION 'INVALID_TICKETS'; END IF;
  IF p_user_id IS NULL AND (p_email IS NULL OR length(p_email) = 0) THEN
    RAISE EXCEPTION 'NO_SUBJECT';
  END IF;

  SELECT * INTO cfg FROM public.sweepstakes_config WHERE id = true;

  IF NOT COALESCE(cfg.sweepstakes_active, FALSE) THEN
    RAISE EXCEPTION 'SWEEPSTAKES_INACTIVE';
  END IF;

  IF cfg.sponsor_address IS NULL
     OR length(trim(cfg.sponsor_address)) < 10
     OR cfg.sponsor_address ILIKE '%COMPLETAR%'
     OR cfg.sponsor_address ILIKE '%[%]%' THEN
    RAISE EXCEPTION 'SPONSOR_ADDRESS_NOT_CONFIGURED';
  END IF;

  IF p_user_id IS NOT NULL THEN
    SELECT terms_accepted INTO v_terms FROM public.profiles WHERE id = p_user_id;
    IF NOT COALESCE(v_terms, FALSE) THEN
      RAISE EXCEPTION 'TERMS_NOT_ACCEPTED';
    END IF;
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

CREATE OR REPLACE FUNCTION public.admin_register_amoe_entry(
  p_email text,
  p_display_name text,
  p_dob date,
  p_state text
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cfg public.sweepstakes_config;
  d DATE := public.today_et();
  row public.daily_draws;
  cutoff TIMESTAMPTZ;
  ent public.daily_draw_entries;
  v_age INT;
  v_state TEXT := upper(trim(p_state));
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RAISE EXCEPTION 'INVALID_EMAIL';
  END IF;

  SELECT * INTO cfg FROM public.sweepstakes_config WHERE id = true;

  IF NOT COALESCE(cfg.sweepstakes_active, FALSE) THEN
    RAISE EXCEPTION 'SWEEPSTAKES_INACTIVE';
  END IF;

  v_age := EXTRACT(YEAR FROM age(CURRENT_DATE, p_dob))::int;
  IF v_age < COALESCE(cfg.min_age, 18) THEN
    RAISE EXCEPTION 'UNDERAGE';
  END IF;

  IF v_state = ANY(COALESCE(cfg.excluded_states, ARRAY['FL','RI']::text[])) THEN
    RAISE EXCEPTION 'EXCLUDED_STATE';
  END IF;

  PERFORM public.ensure_today_draw();
  SELECT * INTO row FROM public.daily_draws WHERE daily_draws.draw_date = d FOR UPDATE;
  cutoff := row.scheduled_at - (cfg.entry_cutoff_minutes || ' minutes')::interval;
  IF row.status <> 'open' OR now() >= cutoff THEN
    RAISE EXCEPTION 'DRAW_CLOSED';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.daily_draw_entries
    WHERE draw_date = d
      AND lower(subject_email) = lower(p_email)
      AND source = 'amoe'
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_AMOE_ENTRY';
  END IF;

  INSERT INTO public.daily_draw_entries (draw_date, subject_user_id, subject_email, display_name, tickets, source)
  VALUES (d, NULL, lower(p_email), COALESCE(NULLIF(trim(p_display_name),''),'AMOE'), 1, 'amoe')
  RETURNING * INTO ent;

  RETURN ent.id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_register_amoe_entry(text, text, date, text) TO authenticated, service_role;
