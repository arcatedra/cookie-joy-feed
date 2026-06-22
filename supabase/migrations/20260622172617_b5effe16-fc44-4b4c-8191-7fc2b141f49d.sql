
-- 1. Sweepstakes configuration
CREATE TABLE IF NOT EXISTS public.sweepstakes_config (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true),
  sponsor_name TEXT NOT NULL DEFAULT 'HAZOREX ORIGEN LLC',
  sponsor_address TEXT NOT NULL DEFAULT '[DIRECCIÓN POSTAL A COMPLETAR]',
  sponsor_email TEXT NOT NULL DEFAULT 'soporte@hazorex.com',
  excluded_states TEXT[] NOT NULL DEFAULT ARRAY['FL','NY','RI']::TEXT[],
  min_age INT NOT NULL DEFAULT 18,
  claim_window_days INT NOT NULL DEFAULT 14,
  entry_cutoff_minutes INT NOT NULL DEFAULT 5,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sweepstakes_config TO anon, authenticated;
GRANT ALL ON public.sweepstakes_config TO service_role;
ALTER TABLE public.sweepstakes_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sweepstakes_config_public_read" ON public.sweepstakes_config FOR SELECT USING (true);

INSERT INTO public.sweepstakes_config(id) VALUES (true) ON CONFLICT DO NOTHING;

-- 2. Expand amoe_entries
ALTER TABLE public.amoe_entries
  ADD COLUMN IF NOT EXISTS address1 TEXT,
  ADD COLUMN IF NOT EXISTS address2 TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS zip TEXT,
  ADD COLUMN IF NOT EXISTS dob DATE,
  ADD COLUMN IF NOT EXISTS draw_date DATE,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS draw_entry_id UUID;

ALTER TABLE public.amoe_entries DROP CONSTRAINT IF EXISTS amoe_entries_email_uq;
DROP INDEX IF EXISTS public.amoe_entries_email_uq;
CREATE UNIQUE INDEX IF NOT EXISTS amoe_entries_email_per_day_uq
  ON public.amoe_entries (lower(email), draw_date) WHERE draw_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS amoe_entries_ip_day_idx
  ON public.amoe_entries (ip, draw_date);

-- 3. daily_draw_entries.source
ALTER TABLE public.daily_draw_entries
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'paid'
    CHECK (source IN ('paid','amoe'));

-- 4. daily_draws status: add 'closed'
ALTER TABLE public.daily_draws DROP CONSTRAINT IF EXISTS daily_draws_status_check;
ALTER TABLE public.daily_draws ADD CONSTRAINT daily_draws_status_check
  CHECK (status IN ('open','closed','drawing','completed','rolled_over'));

-- 5. winner_claims
CREATE TABLE IF NOT EXISTS public.winner_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_date DATE NOT NULL UNIQUE REFERENCES public.daily_draws(draw_date) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  prize_usd NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_verification'
    CHECK (status IN ('pending_verification','verified','rejected','paid','expired')),
  full_name TEXT,
  address1 TEXT,
  address2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  dob DATE,
  phone TEXT,
  id_document_path TEXT,
  w9_document_path TEXT,
  payment_method TEXT,
  payment_destination TEXT,
  payment_reference TEXT,
  paid_at TIMESTAMPTZ,
  rejection_reason TEXT,
  claim_deadline TIMESTAMPTZ NOT NULL,
  notified_at TIMESTAMPTZ,
  last_reminder_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS winner_claims_user_idx ON public.winner_claims(user_id);
CREATE INDEX IF NOT EXISTS winner_claims_status_idx ON public.winner_claims(status);

GRANT SELECT, UPDATE ON public.winner_claims TO authenticated;
GRANT ALL ON public.winner_claims TO service_role;
ALTER TABLE public.winner_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "winner_claims_owner_read" ON public.winner_claims
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "winner_claims_owner_update" ON public.winner_claims
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending_verification')
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "winner_claims_admin_all" ON public.winner_claims
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_winner_claims_updated ON public.winner_claims;
CREATE TRIGGER trg_winner_claims_updated
  BEFORE UPDATE ON public.winner_claims
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 6. submit_amoe_entry
CREATE OR REPLACE FUNCTION public.submit_amoe_entry(
  p_user_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_address1 TEXT,
  p_address2 TEXT,
  p_city TEXT,
  p_state TEXT,
  p_zip TEXT,
  p_dob DATE,
  p_phone TEXT,
  p_essay TEXT,
  p_ip INET,
  p_user_agent TEXT
)
RETURNS TABLE(amoe_id UUID, entry_id UUID, draw_date DATE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- 7. enter_daily_draw with cutoff
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

-- 8. close_draws_for_cutoff
CREATE OR REPLACE FUNCTION public.close_draws_for_cutoff()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE cfg public.sweepstakes_config; n INT;
BEGIN
  SELECT * INTO cfg FROM public.sweepstakes_config WHERE id = true;
  UPDATE public.daily_draws
     SET status = 'closed'
   WHERE status = 'open'
     AND now() >= scheduled_at - (cfg.entry_cutoff_minutes || ' minutes')::interval
     AND now() < scheduled_at;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END; $$;

-- 9. run_daily_draw creates winner_claims
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
  seed TEXT;
  seed_int BIGINT;
  cursor_pos BIGINT;
  acc BIGINT := 0;
  winner public.daily_draw_entries;
  e RECORD;
BEGIN
  PERFORM public.ensure_today_draw();
  SELECT * INTO cfg FROM public.sweepstakes_config WHERE id = true;
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

-- 10. expire_winner_claims
CREATE OR REPLACE FUNCTION public.expire_winner_claims()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE n INT;
BEGIN
  UPDATE public.winner_claims
     SET status = 'expired'
   WHERE status = 'pending_verification' AND claim_deadline < now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END; $$;

-- 11. Storage policies for winner-documents bucket
DROP POLICY IF EXISTS "winner_docs_owner_read" ON storage.objects;
CREATE POLICY "winner_docs_owner_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'winner-documents' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
    )
  );

DROP POLICY IF EXISTS "winner_docs_owner_write" ON storage.objects;
CREATE POLICY "winner_docs_owner_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'winner-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
