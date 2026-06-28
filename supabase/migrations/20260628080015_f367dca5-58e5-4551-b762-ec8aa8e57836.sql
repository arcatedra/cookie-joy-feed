REVOKE SELECT ON public.reel_likes FROM anon;

DROP POLICY IF EXISTS reel_likes_public_read ON public.reel_likes;
CREATE POLICY reel_likes_self_read
ON public.reel_likes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);