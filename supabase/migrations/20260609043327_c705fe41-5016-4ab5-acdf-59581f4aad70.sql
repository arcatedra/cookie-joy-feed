-- Reels: author or admin only UPDATE
DROP POLICY IF EXISTS "reels_author_or_admin_update" ON public.reels;
CREATE POLICY "reels_author_or_admin_update"
ON public.reels
FOR UPDATE
TO authenticated
USING ((auth.uid() = author_id) OR public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK ((auth.uid() = author_id) OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- user_roles: admin-only writes
DROP POLICY IF EXISTS "user_roles_admin_insert" ON public.user_roles;
CREATE POLICY "user_roles_admin_insert"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "user_roles_admin_update" ON public.user_roles;
CREATE POLICY "user_roles_admin_update"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "user_roles_admin_delete" ON public.user_roles;
CREATE POLICY "user_roles_admin_delete"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- reel_likes / reel_comments: restrict SELECT to authenticated users
DROP POLICY IF EXISTS "reel_likes_public_read" ON public.reel_likes;
CREATE POLICY "reel_likes_auth_read"
ON public.reel_likes
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "reel_comments_public_read" ON public.reel_comments;
CREATE POLICY "reel_comments_auth_read"
ON public.reel_comments
FOR SELECT
TO authenticated
USING (true);