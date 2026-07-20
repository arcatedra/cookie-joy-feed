CREATE TABLE public.reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text,
  video_url text,
  thumb_url text,
  product_name text,
  product_price numeric(10,2),
  product_image text,
  product_slug text,
  author_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.reels TO anon, authenticated;
GRANT ALL   ON public.reels TO service_role;

ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reels are publicly readable"
  ON public.reels
  FOR SELECT
  TO anon, authenticated
  USING (true);
