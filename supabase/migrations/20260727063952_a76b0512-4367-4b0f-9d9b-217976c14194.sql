
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL,
  amount_usd numeric NOT NULL CHECK (amount_usd > 0),
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.withdrawal_requests TO authenticated;
GRANT ALL ON public.withdrawal_requests TO service_role;

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "withdrawal_requests_select_own"
  ON public.withdrawal_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

CREATE POLICY "withdrawal_requests_insert_own"
  ON public.withdrawal_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "withdrawal_requests_service_all"
  ON public.withdrawal_requests FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS withdrawal_requests_profile_created_idx
  ON public.withdrawal_requests (profile_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at_withdrawal()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS withdrawal_requests_set_updated_at ON public.withdrawal_requests;
CREATE TRIGGER withdrawal_requests_set_updated_at
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_withdrawal();

-- Atomically request a withdrawal for the caller's available commissions.
CREATE OR REPLACE FUNCTION public.request_affiliate_withdrawal()
RETURNS TABLE(withdrawal_id uuid, amount_usd numeric, commissions_count int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_total numeric := 0;
  v_count int := 0;
  v_withdrawal uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE(SUM(ac.amount_usd), 0), COUNT(*)::int
    INTO v_total, v_count
  FROM public.affiliate_commissions ac
  WHERE ac.affiliate_profile_id = v_uid
    AND ac.status IN ('pending', 'available');

  IF v_count = 0 OR v_total <= 0 THEN
    RAISE EXCEPTION 'No available commissions';
  END IF;

  INSERT INTO public.withdrawal_requests (profile_id, amount_usd, status)
  VALUES (v_uid, v_total, 'pending')
  RETURNING id INTO v_withdrawal;

  UPDATE public.affiliate_commissions
     SET status = 'requested'
   WHERE affiliate_profile_id = v_uid
     AND status IN ('pending', 'available');

  withdrawal_id := v_withdrawal;
  amount_usd := v_total;
  commissions_count := v_count;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_affiliate_withdrawal() TO authenticated;
