
-- 1) Protect donation_tier on profiles via column-level grants
DROP POLICY IF EXISTS profiles_public_read ON public.profiles;

CREATE POLICY profiles_basic_read ON public.profiles
  FOR SELECT
  USING (true);

REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, display_name) ON public.profiles TO anon, authenticated;
GRANT INSERT (id, display_name), UPDATE (display_name) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 2) Reels storage: allow owners and admins to read their objects (signed URLs)
DROP POLICY IF EXISTS "Auth read own reels" ON storage.objects;
CREATE POLICY "Auth read own reels" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'reels' AND owner = auth.uid());

DROP POLICY IF EXISTS "Admin read all reels" ON storage.objects;
CREATE POLICY "Admin read all reels" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'reels' AND public.has_role(auth.uid(), 'admin'));

-- 3) Lock down SECURITY DEFINER functions from signed-in users.
-- Email queue functions: only invoked from server code with service_role.
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

-- Reel count helpers: not called from client code.
REVOKE EXECUTE ON FUNCTION public.reel_like_counts(uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reel_comment_counts(uuid[]) FROM PUBLIC, anon, authenticated;

-- get_my_donation_tier: replaced by an authenticated server function using the admin client.
DROP FUNCTION IF EXISTS public.get_my_donation_tier();
