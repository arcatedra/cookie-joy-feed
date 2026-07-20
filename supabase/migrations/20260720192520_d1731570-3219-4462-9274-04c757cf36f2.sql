
-- reel_likes
CREATE TABLE IF NOT EXISTS public.reel_likes (
  reel_id uuid NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (reel_id, user_id)
);
CREATE INDEX IF NOT EXISTS reel_likes_reel_idx ON public.reel_likes(reel_id);

GRANT SELECT ON public.reel_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.reel_likes TO authenticated;
GRANT ALL ON public.reel_likes TO service_role;

ALTER TABLE public.reel_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reel_likes_select_all" ON public.reel_likes FOR SELECT USING (true);
CREATE POLICY "reel_likes_insert_own" ON public.reel_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reel_likes_delete_own" ON public.reel_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- reel_comments
CREATE TABLE IF NOT EXISTS public.reel_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id uuid NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reel_comments_reel_idx ON public.reel_comments(reel_id, created_at DESC);

GRANT SELECT ON public.reel_comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reel_comments TO authenticated;
GRANT ALL ON public.reel_comments TO service_role;

ALTER TABLE public.reel_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reel_comments_select_all" ON public.reel_comments FOR SELECT USING (true);
CREATE POLICY "reel_comments_insert_own" ON public.reel_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reel_comments_update_own" ON public.reel_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reel_comments_delete_own" ON public.reel_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- RPCs
CREATE OR REPLACE FUNCTION public.reel_like_counts(reel_ids uuid[])
RETURNS TABLE(reel_id uuid, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.reel_id, COUNT(*)::bigint
  FROM public.reel_likes r
  WHERE r.reel_id = ANY(reel_ids)
  GROUP BY r.reel_id;
$$;

CREATE OR REPLACE FUNCTION public.reel_comment_counts(reel_ids uuid[])
RETURNS TABLE(reel_id uuid, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.reel_id, COUNT(*)::bigint
  FROM public.reel_comments c
  WHERE c.reel_id = ANY(reel_ids)
  GROUP BY c.reel_id;
$$;

GRANT EXECUTE ON FUNCTION public.reel_like_counts(uuid[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reel_comment_counts(uuid[]) TO anon, authenticated;

-- Public profile helper (display_name from clientes)
CREATE OR REPLACE FUNCTION public.get_public_profiles(ids uuid[])
RETURNS TABLE(id uuid, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id,
    COALESCE(NULLIF(TRIM(SPLIT_PART(c.nombre_completo, ' ', 1)), ''), 'Usuario') AS display_name
  FROM public.clientes c
  WHERE c.id = ANY(ids);
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO anon, authenticated;

-- Realtime for comments and likes
ALTER PUBLICATION supabase_realtime ADD TABLE public.reel_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reel_likes;
