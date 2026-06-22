
-- Lock down internal SECURITY DEFINER functions (only called via service_role from server fns / cron)
REVOKE EXECUTE ON FUNCTION public.close_draws_for_cutoff() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ensure_today_draw() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.expire_winner_claims() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.run_daily_draw() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enter_daily_draw(uuid, text, text, integer, integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_amoe_entry(uuid, text, text, text, text, text, text, text, date, text, text, inet, text) FROM anon, authenticated, PUBLIC;

-- Pin search_path on email queue helpers
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
