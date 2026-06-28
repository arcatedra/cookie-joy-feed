GRANT SELECT ON public.reels TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reels TO authenticated;
GRANT ALL ON public.reels TO service_role;

GRANT SELECT ON public.reel_comments TO anon;
GRANT SELECT, INSERT, DELETE ON public.reel_comments TO authenticated;
GRANT ALL ON public.reel_comments TO service_role;

GRANT SELECT ON public.reel_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.reel_likes TO authenticated;
GRANT ALL ON public.reel_likes TO service_role;

DROP POLICY IF EXISTS reel_comments_auth_read ON public.reel_comments;
CREATE POLICY reel_comments_public_read
ON public.reel_comments
FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS reel_likes_self_read ON public.reel_likes;
CREATE POLICY reel_likes_public_read
ON public.reel_likes
FOR SELECT
TO public
USING (true);