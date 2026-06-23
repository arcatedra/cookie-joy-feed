
-- ───────────────────────────────────────────────────────────────────
-- 1. Soft-delete columns + index
-- ───────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.donations     ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.winner_claims ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS profiles_active_idx      ON public.profiles      (id)         WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS donations_active_idx     ON public.donations     (user_id)    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS subscriptions_active_idx ON public.subscriptions (user_id)    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS winner_claims_active_idx ON public.winner_claims (draw_date)  WHERE deleted_at IS NULL;

-- ───────────────────────────────────────────────────────────────────
-- 2. Soft-delete BEFORE ROW trigger
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.soft_delete_row()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bypass TEXT := current_setting('app.bulk_delete_ok', true);
  role_name TEXT := current_setting('request.jwt.claim.role', true);
BEGIN
  -- Real delete only when service_role explicitly opts in (purge cron).
  IF bypass = 'on' AND role_name = 'service_role' THEN
    RETURN OLD;
  END IF;

  -- Otherwise convert DELETE → UPDATE deleted_at = now()
  EXECUTE format('UPDATE public.%I SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL', TG_TABLE_NAME)
    USING OLD.id;
  RETURN NULL;
END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','donations','subscriptions','winner_claims'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_soft_delete ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_soft_delete BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.soft_delete_row()', t);
  END LOOP;
END $$;

-- ───────────────────────────────────────────────────────────────────
-- 3. Update SELECT policies to hide soft-deleted from regular users
-- ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can view their own donations" ON public.donations;
CREATE POLICY "Users can view their own donations" ON public.donations FOR SELECT
  TO authenticated USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS winner_claims_owner_read ON public.winner_claims;
CREATE POLICY winner_claims_owner_read ON public.winner_claims FOR SELECT
  TO authenticated USING (
    (user_id = auth.uid() AND deleted_at IS NULL)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- profiles_admin_read, winner_claims_admin_all stay as-is (admins see papelera).

-- ───────────────────────────────────────────────────────────────────
-- 4. Admin-only restore function
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.restore_row(p_table TEXT, p_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n INT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF p_table NOT IN ('profiles','donations','subscriptions','winner_claims') THEN
    RAISE EXCEPTION 'INVALID_TABLE';
  END IF;
  EXECUTE format('UPDATE public.%I SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL', p_table)
    USING p_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.restore_row(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_row(TEXT, UUID) TO authenticated;

-- ───────────────────────────────────────────────────────────────────
-- 5. Soft-deleted listing for the trash UI
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.list_soft_deleted(p_limit INT DEFAULT 100)
RETURNS TABLE(table_name TEXT, id UUID, deleted_at TIMESTAMPTZ, label TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  RETURN QUERY
    SELECT 'profiles'::text, p.id, p.deleted_at,
           COALESCE(p.display_name, p.email, p.id::text) AS label
      FROM public.profiles p WHERE p.deleted_at IS NOT NULL
    UNION ALL
    SELECT 'donations'::text, d.id, d.deleted_at,
           ('$' || COALESCE(d.amount_usd::text,'0')) AS label
      FROM public.donations d WHERE d.deleted_at IS NOT NULL
    UNION ALL
    SELECT 'subscriptions'::text, s.id, s.deleted_at,
           COALESCE(s.status,'subscription') AS label
      FROM public.subscriptions s WHERE s.deleted_at IS NOT NULL
    UNION ALL
    SELECT 'winner_claims'::text, w.id, w.deleted_at,
           (w.draw_date::text || ' · ' || COALESCE(w.display_name,'?')) AS label
      FROM public.winner_claims w WHERE w.deleted_at IS NOT NULL
    ORDER BY 3 DESC
    LIMIT GREATEST(LEAST(p_limit, 500), 1);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.list_soft_deleted(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_soft_deleted(INT) TO authenticated;

-- ───────────────────────────────────────────────────────────────────
-- 6. Cron status function (admin only)
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cron_status()
RETURNS TABLE(jobname TEXT, schedule TEXT, last_start TIMESTAMPTZ, last_status TEXT, last_msg TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, cron
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  RETURN QUERY
    SELECT j.jobname::text, j.schedule::text, r.start_time, r.status::text, r.return_message::text
      FROM cron.job j
      LEFT JOIN LATERAL (
        SELECT start_time, status, return_message
          FROM cron.job_run_details d
         WHERE d.jobid = j.jobid
         ORDER BY start_time DESC NULLS LAST
         LIMIT 1
      ) r ON true
     ORDER BY j.jobname;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cron_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cron_status() TO authenticated;

-- ───────────────────────────────────────────────────────────────────
-- 7. Audit-log AFTER INSERT trigger → fire HTTP webhook for alert email
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.security_audit_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hook_url TEXT;
  hook_secret TEXT;
BEGIN
  -- Only fire for blocked events, not bypasses
  IF NEW.event <> 'bulk_delete_blocked' THEN RETURN NEW; END IF;

  SELECT value INTO hook_url    FROM public.internal_hook_config WHERE key = 'security_alert_url';
  SELECT value INTO hook_secret FROM public.internal_hook_config WHERE key = 'security_alert_secret';
  IF hook_url IS NULL OR hook_secret IS NULL THEN RETURN NEW; END IF;

  PERFORM net.http_post(
    url := hook_url,
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || hook_secret),
    body := jsonb_build_object(
      'audit_id', NEW.id,
      'event', NEW.event,
      'table_name', NEW.table_name,
      'row_count', NEW.row_count,
      'actor_role', NEW.actor_role,
      'created_at', NEW.created_at
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_security_audit_notify ON public.security_audit_log;
CREATE TRIGGER trg_security_audit_notify AFTER INSERT ON public.security_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.security_audit_notify();
