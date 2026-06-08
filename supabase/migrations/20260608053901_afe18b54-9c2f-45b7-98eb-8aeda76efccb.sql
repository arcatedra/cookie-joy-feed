
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Reels (catalog)
CREATE TABLE public.reels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reels TO anon, authenticated;
GRANT ALL ON public.reels TO service_role;
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reels_public_read" ON public.reels FOR SELECT USING (true);

INSERT INTO public.reels (slug) VALUES ('reel1'), ('reel2'), ('reel3');

-- Reel likes
CREATE TABLE public.reel_likes (
  reel_id UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (reel_id, user_id)
);
GRANT SELECT ON public.reel_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.reel_likes TO authenticated;
GRANT ALL ON public.reel_likes TO service_role;
ALTER TABLE public.reel_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reel_likes_public_read" ON public.reel_likes FOR SELECT USING (true);
CREATE POLICY "reel_likes_self_insert" ON public.reel_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reel_likes_self_delete" ON public.reel_likes FOR DELETE USING (auth.uid() = user_id);

-- Reel comments
CREATE TABLE public.reel_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX reel_comments_reel_idx ON public.reel_comments (reel_id, created_at DESC);
GRANT SELECT ON public.reel_comments TO anon, authenticated;
GRANT INSERT, DELETE ON public.reel_comments TO authenticated;
GRANT ALL ON public.reel_comments TO service_role;
ALTER TABLE public.reel_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reel_comments_public_read" ON public.reel_comments FOR SELECT USING (true);
CREATE POLICY "reel_comments_self_insert" ON public.reel_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reel_comments_self_delete" ON public.reel_comments FOR DELETE USING (auth.uid() = user_id);

-- Product ratings
CREATE TABLE public.product_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stars SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  review TEXT CHECK (review IS NULL OR char_length(review) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);
CREATE INDEX product_ratings_product_idx ON public.product_ratings (product_id);
GRANT SELECT ON public.product_ratings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_ratings TO authenticated;
GRANT ALL ON public.product_ratings TO service_role;
ALTER TABLE public.product_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_ratings_public_read" ON public.product_ratings FOR SELECT USING (true);
CREATE POLICY "product_ratings_self_insert" ON public.product_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "product_ratings_self_update" ON public.product_ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "product_ratings_self_delete" ON public.product_ratings FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER product_ratings_touch BEFORE UPDATE ON public.product_ratings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
