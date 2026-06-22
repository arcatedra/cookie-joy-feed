
-- 1) Profile columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- 2) Trigger: stamp terms_accepted_at; prevent un-acceptance
CREATE OR REPLACE FUNCTION public.profiles_terms_consent_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.terms_accepted = TRUE AND NEW.terms_accepted_at IS NULL THEN
      NEW.terms_accepted_at := now();
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF OLD.terms_accepted = TRUE AND NEW.terms_accepted = FALSE THEN
    RAISE EXCEPTION 'TERMS_CANNOT_BE_REVOKED';
  END IF;
  IF NEW.terms_accepted = TRUE AND OLD.terms_accepted = FALSE THEN
    NEW.terms_accepted_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_terms_consent_guard ON public.profiles;
CREATE TRIGGER profiles_terms_consent_guard
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_terms_consent_guard();

-- 3) Update handle_new_user to capture email, region, terms from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_name TEXT := COALESCE(meta->>'name', meta->>'full_name', split_part(NEW.email, '@', 1));
  v_region TEXT := NULLIF(meta->>'region', '');
  v_terms BOOLEAN := COALESCE((meta->>'terms_accepted')::boolean, FALSE);
BEGIN
  INSERT INTO public.profiles (id, display_name, full_name, email, region, terms_accepted)
  VALUES (NEW.id, v_name, v_name, NEW.email, v_region, v_terms)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
        region = COALESCE(public.profiles.region, EXCLUDED.region),
        terms_accepted = public.profiles.terms_accepted OR EXCLUDED.terms_accepted;
  RETURN NEW;
END;
$$;

-- 4) Enforce terms_accepted in enter_daily_draw (paid tickets)
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

  IF cfg.sponsor_address IS NULL
     OR length(trim(cfg.sponsor_address)) < 10
     OR cfg.sponsor_address ILIKE '%COMPLETAR%'
     OR cfg.sponsor_address ILIKE '%[%]%' THEN
    RAISE EXCEPTION 'SPONSOR_ADDRESS_NOT_CONFIGURED';
  END IF;

  -- Require terms acceptance for paid entries (registered users)
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

-- 5) Backfill: mark existing accounts as accepted if they have used the platform
-- (no-op safety: keep default false; users will be prompted next time)
