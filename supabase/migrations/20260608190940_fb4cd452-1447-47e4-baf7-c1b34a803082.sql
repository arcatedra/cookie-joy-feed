-- Extend reels with display fields
ALTER TABLE public.reels
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS thumb_url text,
  ADD COLUMN IF NOT EXISTS product_name text,
  ADD COLUMN IF NOT EXISTS product_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS product_image text,
  ADD COLUMN IF NOT EXISTS product_slug text,
  ADD COLUMN IF NOT EXISTS author_id uuid;

-- Allow authenticated users to insert their own reels
DROP POLICY IF EXISTS reels_auth_insert ON public.reels;
CREATE POLICY reels_auth_insert ON public.reels
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS reels_author_delete ON public.reels;
CREATE POLICY reels_author_delete ON public.reels
  FOR DELETE TO authenticated
  USING (auth.uid() = author_id);

-- Seed 3 demo reels with fixed UUIDs (idempotent)
INSERT INTO public.reels (id, slug, title, video_url, product_name, product_price, product_image, product_slug)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'demo-nutella', 'Recién horneadas 🍫 chocolate derretido', '', 'Galleta Explosiva de Nutella', 4.95, '', 'p-doublechoc'),
  ('22222222-2222-2222-2222-222222222222', 'demo-cookies-cream', 'Cookies & Cream: el clásico premium', '', 'Cookies & Cream Premium', 4.25, '', 'p-cc'),
  ('33333333-3333-3333-3333-333333333333', 'demo-pb', 'Crunch de maní recién salido del horno', '', 'Mantequilla de Maní Crunch', 3.75, '', 'p-pb')
ON CONFLICT (id) DO NOTHING;

-- Enable realtime for likes & comments
ALTER TABLE public.reel_likes REPLICA IDENTITY FULL;
ALTER TABLE public.reel_comments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reel_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reel_comments;