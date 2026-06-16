
-- 1) Restrict donation_tier visibility (column-level + RPC for self-read)
REVOKE SELECT (donation_tier) ON public.profiles FROM anon;
REVOKE SELECT (donation_tier) ON public.profiles FROM authenticated;
GRANT SELECT (id, display_name, created_at) ON public.profiles TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_donation_tier()
RETURNS public.donation_tier
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT donation_tier FROM public.profiles WHERE id = auth.uid()
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_donation_tier() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_donation_tier() TO authenticated;

-- 2) Lock down internal pgmq wrappers — server-only via service_role
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;

-- 3) Pin search_path on the pgmq wrapper functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
