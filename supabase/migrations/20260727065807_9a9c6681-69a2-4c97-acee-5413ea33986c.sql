
-- 1) Admin RLS additions
CREATE POLICY withdrawal_requests_admin_all ON public.withdrawal_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY affiliate_commissions_admin_all ON public.affiliate_commissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) Auto-promote pending -> available after 7 days
CREATE OR REPLACE FUNCTION public.promote_available_commissions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count int;
BEGIN
  UPDATE public.affiliate_commissions
     SET status = 'available'
   WHERE status = 'pending'
     AND created_at <= now() - interval '7 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Schedule via pg_cron (hourly)
CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$
BEGIN
  PERFORM cron.unschedule('promote-available-commissions');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
SELECT cron.schedule(
  'promote-available-commissions',
  '0 * * * *',
  $$SELECT public.promote_available_commissions();$$
);

-- 3) Only withdraw available (not pending)
CREATE OR REPLACE FUNCTION public.request_affiliate_withdrawal()
RETURNS TABLE(withdrawal_id uuid, amount_usd numeric, commissions_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

  -- Promote just-in-time to catch late items
  PERFORM public.promote_available_commissions();

  SELECT COALESCE(SUM(ac.amount_usd), 0), COUNT(*)::int
    INTO v_total, v_count
  FROM public.affiliate_commissions ac
  WHERE ac.affiliate_profile_id = v_uid
    AND ac.status = 'available';

  IF v_count = 0 OR v_total <= 0 THEN
    RAISE EXCEPTION 'No available commissions';
  END IF;

  INSERT INTO public.withdrawal_requests (profile_id, amount_usd, status)
  VALUES (v_uid, v_total, 'pending')
  RETURNING id INTO v_withdrawal;

  UPDATE public.affiliate_commissions
     SET status = 'requested'
   WHERE affiliate_profile_id = v_uid
     AND status = 'available';

  withdrawal_id := v_withdrawal;
  amount_usd := v_total;
  commissions_count := v_count;
  RETURN NEXT;
END;
$$;

-- 4) Admin listing (join with profile/cliente for display)
CREATE OR REPLACE FUNCTION public.admin_list_withdrawals()
RETURNS TABLE(
  id uuid,
  profile_id uuid,
  amount_usd numeric,
  status text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz,
  affiliate_name text,
  affiliate_email text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT w.id, w.profile_id, w.amount_usd, w.status, w.notes,
         w.created_at, w.updated_at,
         COALESCE(c.nombre_completo, p.name, 'Afiliado') AS affiliate_name,
         c.email AS affiliate_email
    FROM public.withdrawal_requests w
    LEFT JOIN public.profiles p ON p.id = w.profile_id
    LEFT JOIN public.clientes c ON c.id = w.profile_id
   ORDER BY
     CASE WHEN w.status = 'pending' THEN 0 ELSE 1 END,
     w.created_at DESC;
END;
$$;

-- 5) Admin process withdrawal
CREATE OR REPLACE FUNCTION public.admin_process_withdrawal(p_withdrawal_id uuid, p_action text, p_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile uuid;
  v_status text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF p_action NOT IN ('paid_out', 'rejected') THEN
    RAISE EXCEPTION 'Invalid action';
  END IF;

  SELECT profile_id, status INTO v_profile, v_status
    FROM public.withdrawal_requests
   WHERE id = p_withdrawal_id
   FOR UPDATE;

  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Withdrawal not found';
  END IF;

  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'Withdrawal already processed';
  END IF;

  IF p_action = 'paid_out' THEN
    UPDATE public.affiliate_commissions
       SET status = 'paid_out'
     WHERE affiliate_profile_id = v_profile
       AND status = 'requested';

    UPDATE public.withdrawal_requests
       SET status = 'paid_out', notes = COALESCE(p_notes, notes), updated_at = now()
     WHERE id = p_withdrawal_id;
  ELSE
    -- rejected: return commissions to available
    UPDATE public.affiliate_commissions
       SET status = 'available'
     WHERE affiliate_profile_id = v_profile
       AND status = 'requested';

    UPDATE public.withdrawal_requests
       SET status = 'rejected', notes = COALESCE(p_notes, notes), updated_at = now()
     WHERE id = p_withdrawal_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_withdrawals() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_process_withdrawal(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.promote_available_commissions() TO authenticated, service_role;
