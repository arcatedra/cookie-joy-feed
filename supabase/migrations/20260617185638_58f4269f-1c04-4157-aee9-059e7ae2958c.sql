
-- 1. Lock down donation_tier on profiles (no self-assignment, no public column read)
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
REVOKE SELECT (donation_tier) ON public.profiles FROM anon, authenticated;
GRANT UPDATE (display_name) ON public.profiles TO authenticated;

-- Defense in depth: a trigger blocks any UPDATE attempt that tries to change donation_tier
-- unless executed by the service_role (server-side donation flow).
CREATE OR REPLACE FUNCTION public.prevent_donation_tier_self_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.donation_tier IS DISTINCT FROM OLD.donation_tier
     AND current_setting('request.jwt.claim.role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'donation_tier can only be modified by the donation processing system';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_block_donation_tier_self_change ON public.profiles;
CREATE TRIGGER profiles_block_donation_tier_self_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_donation_tier_self_change();

-- 2. Allow service_role to clean up unsubscribe tokens (was missing DELETE policy)
DROP POLICY IF EXISTS "Service role can delete tokens" ON public.email_unsubscribe_tokens;
CREATE POLICY "Service role can delete tokens"
  ON public.email_unsubscribe_tokens
  FOR DELETE
  USING (auth.role() = 'service_role');

-- 3. Restrict reel_likes reads to the row owner; expose aggregate counts via a SECURITY DEFINER fn
DROP POLICY IF EXISTS reel_likes_auth_read ON public.reel_likes;
CREATE POLICY reel_likes_self_read
  ON public.reel_likes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.reel_like_counts(reel_ids uuid[])
RETURNS TABLE(reel_id uuid, like_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rl.reel_id, COUNT(*)::bigint
  FROM public.reel_likes rl
  WHERE rl.reel_id = ANY(reel_ids)
  GROUP BY rl.reel_id
$$;
REVOKE ALL ON FUNCTION public.reel_like_counts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reel_like_counts(uuid[]) TO anon, authenticated;

-- 4. Restrict reel_comments read to authenticated users (still public among signed-in users,
--    but no longer accessible to anon). Comments display author names which is intentional
--    social content; restricting further would break the feature.
DROP POLICY IF EXISTS reel_comments_auth_read ON public.reel_comments;
CREATE POLICY reel_comments_auth_read
  ON public.reel_comments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.reel_comment_counts(reel_ids uuid[])
RETURNS TABLE(reel_id uuid, comment_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rc.reel_id, COUNT(*)::bigint
  FROM public.reel_comments rc
  WHERE rc.reel_id = ANY(reel_ids)
  GROUP BY rc.reel_id
$$;
REVOKE ALL ON FUNCTION public.reel_comment_counts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reel_comment_counts(uuid[]) TO anon, authenticated;

-- 5. Lock down SECURITY DEFINER functions that should not be callable by anon/authenticated.
--    Internal queue helpers — service_role only.
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;

--    handle_new_user is a trigger function — no direct callers needed.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

--    has_role and get_my_donation_tier must remain callable by authenticated users (used in RLS
--    and in the app), but should not be callable by anon.
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_my_donation_tier() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_donation_tier() TO authenticated, service_role;
