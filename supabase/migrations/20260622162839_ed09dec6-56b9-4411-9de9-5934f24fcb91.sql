
-- ============ TABLES ============

CREATE TABLE public.daily_draws (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  draw_date DATE NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','drawing','completed','rolled_over')),
  winner_subject_user_id UUID NULL,
  winner_subject_email TEXT NULL,
  winner_display_name TEXT NULL,
  prize_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  tickets_total INTEGER NOT NULL DEFAULT 0,
  entrants_total INTEGER NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMPTZ NOT NULL,
  drawn_at TIMESTAMPTZ NULL,
  seed_hash TEXT NULL,
  rolled_over_from DATE NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.daily_draws TO service_role;
ALTER TABLE public.daily_draws ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_only_daily_draws"
ON public.daily_draws FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE TRIGGER trg_daily_draws_updated
BEFORE UPDATE ON public.daily_draws
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.daily_draw_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  draw_date DATE NOT NULL,
  subject_user_id UUID NULL,
  subject_email TEXT NULL,
  display_name TEXT NOT NULL,
  tickets INTEGER NOT NULL DEFAULT 1 CHECK (tickets > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (subject_user_id IS NOT NULL OR subject_email IS NOT NULL)
);

CREATE INDEX idx_daily_draw_entries_date ON public.daily_draw_entries(draw_date);
CREATE INDEX idx_daily_draw_entries_user ON public.daily_draw_entries(subject_user_id);
CREATE INDEX idx_daily_draw_entries_email ON public.daily_draw_entries(subject_email);

GRANT ALL ON public.daily_draw_entries TO service_role;
ALTER TABLE public.daily_draw_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_only_daily_draw_entries"
ON public.daily_draw_entries FOR ALL
TO service_role
USING (true) WITH CHECK (true);

-- ============ HELPERS ============

-- Compute "today" in America/New_York
CREATE OR REPLACE FUNCTION public.today_et()
RETURNS DATE
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT (now() AT TIME ZONE 'America/New_York')::date
$$;

-- 8 PM ET on a given date, as UTC timestamptz
CREATE OR REPLACE FUNCTION public.draw_time_for(p_date DATE)
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT (p_date::timestamp + interval '20 hours') AT TIME ZONE 'America/New_York'
$$;

-- Ensure today's draw row exists; carry over bote if previous day rolled over.
CREATE OR REPLACE FUNCTION public.ensure_today_draw()
RETURNS public.daily_draws
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d DATE := public.today_et();
  existing public.daily_draws;
  prior public.daily_draws;
  carry NUMERIC(12,2) := 0;
  carry_from DATE := NULL;
BEGIN
  SELECT * INTO existing FROM public.daily_draws WHERE draw_date = d;
  IF FOUND THEN
    RETURN existing;
  END IF;

  -- Find most recent prior draw that rolled over (chain)
  SELECT * INTO prior FROM public.daily_draws
   WHERE draw_date < d AND status = 'rolled_over'
   ORDER BY draw_date DESC LIMIT 1;
  IF FOUND THEN
    carry := prior.prize_usd;
    carry_from := prior.draw_date;
  END IF;

  INSERT INTO public.daily_draws (draw_date, status, scheduled_at, prize_usd, rolled_over_from)
  VALUES (d, 'open', public.draw_time_for(d), carry, carry_from)
  RETURNING * INTO existing;

  RETURN existing;
END;
$$;

-- ============ PUBLIC RPCs ============

CREATE OR REPLACE FUNCTION public.get_today_draw()
RETURNS TABLE(
  draw_date DATE,
  status TEXT,
  scheduled_at TIMESTAMPTZ,
  prize_usd_live NUMERIC,
  tickets_total INTEGER,
  entrants_total INTEGER,
  winner_display_name TEXT,
  seed_hash TEXT,
  rolled_over_from DATE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d DATE := public.today_et();
  row public.daily_draws;
  today_pool NUMERIC(12,2);
BEGIN
  SELECT * INTO row FROM public.daily_draws WHERE daily_draws.draw_date = d;

  -- If no row yet, synthesize an "open" placeholder + carry-over
  IF NOT FOUND THEN
    SELECT COALESCE(SUM(prize_usd),0) INTO today_pool
      FROM public.daily_draws
     WHERE daily_draws.draw_date < d AND status = 'rolled_over'
       AND daily_draws.draw_date > COALESCE((
         SELECT MAX(daily_draws.draw_date) FROM public.daily_draws
          WHERE daily_draws.draw_date < d AND status = 'completed'
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

  -- Live pool = snapshot (if completed) OR carry-over + today's contributions
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
$$;

GRANT EXECUTE ON FUNCTION public.get_today_draw() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_recent_winners(p_limit INT DEFAULT 14)
RETURNS TABLE(
  draw_date DATE,
  winner_display_name TEXT,
  prize_usd NUMERIC,
  seed_hash TEXT,
  drawn_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.draw_date, d.winner_display_name, d.prize_usd, d.seed_hash, d.drawn_at
    FROM public.daily_draws d
   WHERE d.status = 'completed' AND d.winner_display_name IS NOT NULL
   ORDER BY d.draw_date DESC
   LIMIT GREATEST(LEAST(p_limit, 100), 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_recent_winners(int) TO anon, authenticated;

-- ============ ENTRY ============
-- Called from server function. Caller must pass subject identity (validated server-side).
-- Spends tokens from user_tokens (1 ticket = 10 stars) and inserts entry.

CREATE OR REPLACE FUNCTION public.enter_daily_draw(
  p_user_id UUID,
  p_email TEXT,
  p_display_name TEXT,
  p_tickets INT,
  p_cost_per_ticket INT DEFAULT 10
)
RETURNS TABLE(new_balance INT, tickets_added INT, entry_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d DATE := public.today_et();
  row public.daily_draws;
  tk RECORD;
  cost INT := p_tickets * p_cost_per_ticket;
  ent public.daily_draw_entries;
BEGIN
  IF p_tickets < 1 OR p_tickets > 100 THEN
    RAISE EXCEPTION 'INVALID_TICKETS';
  END IF;
  IF p_user_id IS NULL AND (p_email IS NULL OR length(p_email) = 0) THEN
    RAISE EXCEPTION 'NO_SUBJECT';
  END IF;

  -- Ensure draw row exists (with carry-over)
  PERFORM public.ensure_today_draw();
  SELECT * INTO row FROM public.daily_draws WHERE daily_draws.draw_date = d FOR UPDATE;
  IF row.status <> 'open' THEN
    RAISE EXCEPTION 'DRAW_CLOSED';
  END IF;

  -- Fetch and spend tokens atomically
  IF p_user_id IS NOT NULL THEN
    SELECT * INTO tk FROM public.user_tokens WHERE user_id = p_user_id FOR UPDATE;
  ELSE
    SELECT * INTO tk FROM public.user_tokens WHERE lower(guest_email) = lower(p_email) FOR UPDATE;
  END IF;

  IF NOT FOUND OR tk.balance < cost THEN
    RAISE EXCEPTION 'INSUFFICIENT_STARS';
  END IF;

  UPDATE public.user_tokens SET balance = balance - cost WHERE id = tk.id;

  INSERT INTO public.daily_draw_entries (draw_date, subject_user_id, subject_email, display_name, tickets)
  VALUES (d, p_user_id, lower(p_email), COALESCE(NULLIF(trim(p_display_name),''),'Anónimo'), p_tickets)
  RETURNING * INTO ent;

  RETURN QUERY SELECT (tk.balance - cost)::int, p_tickets, ent.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enter_daily_draw(uuid, text, text, int, int) TO service_role;

-- ============ DRAW EXECUTOR ============

CREATE OR REPLACE FUNCTION public.run_daily_draw()
RETURNS TABLE(
  draw_date DATE,
  status TEXT,
  winner_display_name TEXT,
  prize_usd NUMERIC,
  seed_hash TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d DATE := public.today_et();
  row public.daily_draws;
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
  SELECT * INTO row FROM public.daily_draws WHERE daily_draws.draw_date = d FOR UPDATE;

  -- Idempotent
  IF row.status IN ('completed','rolled_over') THEN
    RETURN QUERY SELECT row.draw_date, row.status, row.winner_display_name, row.prize_usd, row.seed_hash;
    RETURN;
  END IF;

  UPDATE public.daily_draws SET status = 'drawing' WHERE id = row.id;

  -- Compute live pool = carry-over (already in row.prize_usd) + today's contributions
  SELECT COALESCE(SUM(pool_share_usd),0) INTO live_pool FROM public.prize_pool_ledger
   WHERE (created_at AT TIME ZONE 'America/New_York')::date = d;
  live_pool := live_pool + row.prize_usd;

  SELECT COALESCE(SUM(tickets),0)::int, COUNT(*)::int
    INTO total_tickets, entrants
    FROM public.daily_draw_entries WHERE daily_draw_entries.draw_date = d;

  -- Generate transparent seed
  seed := encode(digest(d::text || '|' || total_tickets::text || '|' || gen_random_uuid()::text, 'sha256'),'hex');

  IF total_tickets = 0 THEN
    -- Roll over: no entries, bote stays for next day
    UPDATE public.daily_draws
       SET status = 'rolled_over',
           prize_usd = live_pool,
           tickets_total = 0,
           entrants_total = 0,
           drawn_at = now(),
           seed_hash = seed
     WHERE id = row.id;

    RETURN QUERY SELECT d, 'rolled_over'::text, NULL::text, live_pool, seed;
    RETURN;
  END IF;

  -- Weighted random selection from seed
  seed_int := ('x' || substr(seed,1,15))::bit(60)::bigint;
  cursor_pos := (abs(seed_int) % total_tickets);

  FOR e IN
    SELECT * FROM public.daily_draw_entries
     WHERE daily_draw_entries.draw_date = d
     ORDER BY created_at ASC, id ASC
  LOOP
    acc := acc + e.tickets;
    IF acc > cursor_pos THEN
      winner := e;
      EXIT;
    END IF;
  END LOOP;

  UPDATE public.daily_draws
     SET status = 'completed',
         winner_subject_user_id = winner.subject_user_id,
         winner_subject_email = winner.subject_email,
         winner_display_name = winner.display_name,
         prize_usd = live_pool,
         tickets_total = total_tickets,
         entrants_total = entrants,
         drawn_at = now(),
         seed_hash = seed
   WHERE id = row.id;

  RETURN QUERY SELECT d, 'completed'::text, winner.display_name, live_pool, seed;
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_daily_draw() TO service_role;

-- pgcrypto for digest()
CREATE EXTENSION IF NOT EXISTS pgcrypto;
