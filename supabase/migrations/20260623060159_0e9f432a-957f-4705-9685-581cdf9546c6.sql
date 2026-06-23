
-- Audit table for blocked bulk-delete attempts
CREATE TABLE public.security_audit_log (
  id BIGSERIAL PRIMARY KEY,
  event TEXT NOT NULL,
  table_name TEXT,
  row_count INT,
  actor_role TEXT,
  actor_uid UUID,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.security_audit_log TO authenticated;
GRANT ALL ON public.security_audit_log TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.security_audit_log_id_seq TO service_role;

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view security audit log"
  ON public.security_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Statement-level trigger function: blocks bulk deletes
CREATE OR REPLACE FUNCTION public.prevent_bulk_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n INT;
  max_rows CONSTANT INT := 50;
  bypass TEXT;
  current_role_name TEXT;
BEGIN
  SELECT count(*) INTO n FROM old_rows;
  IF n <= max_rows THEN
    RETURN NULL;
  END IF;

  -- Emergency switch: service_role only, must be explicitly set per-transaction
  bypass := current_setting('app.bulk_delete_ok', true);
  current_role_name := current_setting('request.jwt.claim.role', true);
  IF bypass = 'on' AND current_role_name = 'service_role' THEN
    INSERT INTO public.security_audit_log(event, table_name, row_count, actor_role, details)
    VALUES ('bulk_delete_bypassed', TG_TABLE_NAME, n, current_role_name,
            jsonb_build_object('limit', max_rows));
    RETURN NULL;
  END IF;

  INSERT INTO public.security_audit_log(event, table_name, row_count, actor_role, actor_uid, details)
  VALUES ('bulk_delete_blocked', TG_TABLE_NAME, n,
          COALESCE(current_role_name, 'unknown'),
          NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid,
          jsonb_build_object('limit', max_rows));

  RAISE EXCEPTION 'BULK_DELETE_BLOCKED: attempted to delete % rows from % (limit %). If this is intentional and you are service_role, run SET LOCAL "app.bulk_delete_ok" = ''on'' before the DELETE.',
    n, TG_TABLE_NAME, max_rows;
END;
$$;

-- Attach to critical tables
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'profiles','donations','subscriptions','winner_claims','daily_draws',
    'daily_draw_entries','winner_announcements','prize_pool_ledger',
    'sweepstakes_config','user_tokens','amoe_entries','user_roles',
    'mission_claims','mission_starts','spin_history','spin_coupons',
    'reels','reel_comments','reel_likes','star_purchases',
    'delivery_bookings','shipping_quotes','product_ratings','app_settings',
    'email_send_log','email_send_state','suppressed_emails',
    'email_unsubscribe_tokens','internal_hook_config','test_winner_log'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_prevent_bulk_delete ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_prevent_bulk_delete
         AFTER DELETE ON public.%I
         REFERENCING OLD TABLE AS old_rows
         FOR EACH STATEMENT
         EXECUTE FUNCTION public.prevent_bulk_delete()', t);
  END LOOP;
END $$;
