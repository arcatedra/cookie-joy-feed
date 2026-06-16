ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS expires_at timestamptz;
UPDATE public.reels SET expires_at = created_at + interval '1 hour' WHERE expires_at IS NULL;
CREATE INDEX IF NOT EXISTS reels_expires_at_idx ON public.reels (expires_at);