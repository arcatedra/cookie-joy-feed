
-- 1. Harden profiles: remove public read, add own-row read; expose only display_name via view
DROP POLICY IF EXISTS profiles_public_basic_read ON public.profiles;

CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY profiles_admin_read ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

REVOKE SELECT ON public.profiles FROM anon;

-- Public-safe view exposing only display name (used by reels/comments UI)
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT id, display_name FROM public.profiles;

-- View needs underlying SELECT; create a permissive policy limited to safe columns?
-- Simpler: switch view to security_definer-style by using a SECURITY DEFINER function via RLS bypass.
-- Drop view, use a SECURITY DEFINER function instead.
DROP VIEW public.public_profiles;

CREATE OR REPLACE FUNCTION public.get_public_profiles(ids uuid[])
RETURNS TABLE(id uuid, display_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.display_name FROM public.profiles p WHERE p.id = ANY(ids);
$$;

REVOKE EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO anon, authenticated;

-- 2. Harden test_winner_log: remove public read; admins only via existing RPC (which is SECURITY DEFINER)
DROP POLICY IF EXISTS test_winner_log_public_read ON public.test_winner_log;
REVOKE SELECT ON public.test_winner_log FROM anon, authenticated;

-- 3. has_role -> SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- 4. mission_starts: add own-row INSERT/SELECT policies
CREATE POLICY mission_starts_insert_own ON public.mission_starts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY mission_starts_select_own ON public.mission_starts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 5. Revoke EXECUTE on admin/cron-only SECURITY DEFINER functions from public roles
REVOKE EXECUTE ON FUNCTION public.run_daily_draw() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.expire_winner_claims() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.close_draws_for_cutoff() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.run_test_draw_tick() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_winner_via_hook() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ensure_today_draw() FROM anon, authenticated, PUBLIC;
