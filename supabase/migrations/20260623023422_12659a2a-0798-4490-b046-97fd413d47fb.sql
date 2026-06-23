
CREATE TABLE public.test_winner_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  winner_display_name TEXT NOT NULL,
  winner_email TEXT,
  prize_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  delivered BOOLEAN NOT NULL DEFAULT TRUE,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.test_winner_log TO anon, authenticated;
GRANT ALL ON public.test_winner_log TO service_role;

ALTER TABLE public.test_winner_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "test_winner_log_public_read"
ON public.test_winner_log FOR SELECT
TO anon, authenticated
USING (true);

CREATE INDEX idx_test_winner_log_created_at ON public.test_winner_log (created_at DESC);

CREATE OR REPLACE FUNCTION public.run_test_draw_tick()
RETURNS TABLE(id UUID, winner_display_name TEXT, prize_usd NUMERIC, delivered BOOLEAN, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pick RECORD;
  prize NUMERIC(12,2);
  new_id UUID;
  pick_name TEXT;
  pick_email TEXT;
BEGIN
  SELECT display_name, subject_email
    INTO pick
    FROM public.daily_draw_entries
    ORDER BY random()
    LIMIT 1;

  IF NOT FOUND THEN
    pick_name := 'Participante demo';
    pick_email := NULL;
  ELSE
    pick_name := COALESCE(pick.display_name, 'Participante');
    pick_email := pick.subject_email;
  END IF;

  prize := (10 + (random() * 490))::numeric(12,2);

  INSERT INTO public.test_winner_log (winner_display_name, winner_email, prize_usd, delivered, delivered_at)
  VALUES (pick_name, pick_email, prize, TRUE, now())
  RETURNING test_winner_log.id INTO new_id;

  RETURN QUERY
    SELECT t.id, t.winner_display_name, t.prize_usd, t.delivered, t.created_at
      FROM public.test_winner_log t
     WHERE t.id = new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_recent_test_winners(p_limit INT DEFAULT 20)
RETURNS TABLE(id UUID, winner_display_name TEXT, prize_usd NUMERIC, delivered BOOLEAN, created_at TIMESTAMPTZ)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.winner_display_name, t.prize_usd, t.delivered, t.created_at
    FROM public.test_winner_log t
   ORDER BY t.created_at DESC
   LIMIT GREATEST(LEAST(p_limit, 100), 1);
$$;

GRANT EXECUTE ON FUNCTION public.run_test_draw_tick() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_recent_test_winners(INT) TO anon, authenticated, service_role;
