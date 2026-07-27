
DROP POLICY IF EXISTS reel_comments_select_all ON public.reel_comments;
CREATE POLICY reel_comments_select_authenticated ON public.reel_comments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS reel_likes_select_all ON public.reel_likes;
CREATE POLICY reel_likes_select_authenticated ON public.reel_likes
  FOR SELECT TO authenticated USING (true);
