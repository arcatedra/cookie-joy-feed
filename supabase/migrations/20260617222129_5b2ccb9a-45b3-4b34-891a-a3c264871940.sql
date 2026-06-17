
-- 1. product_ratings: hide user_id from anon (column-level)
REVOKE SELECT (user_id) ON public.product_ratings FROM anon;

-- 2. profiles.donation_tier: hide from anon and authenticated
REVOKE SELECT (donation_tier) ON public.profiles FROM anon, authenticated;

-- 3. Drop public read storage policy on reels bucket
DROP POLICY IF EXISTS "Public read reels bucket" ON storage.objects;

-- 4. Remove reel_likes from realtime publication (leaks user_id)
ALTER PUBLICATION supabase_realtime DROP TABLE public.reel_likes;

-- 5. Lock down SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_donation_tier_self_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;

-- Functions called from the client by signed-in users: keep only authenticated
REVOKE EXECUTE ON FUNCTION public.get_my_donation_tier() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_donation_tier() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.reel_like_counts(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reel_like_counts(uuid[]) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.reel_comment_counts(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reel_comment_counts(uuid[]) TO authenticated;
