-- Suggestions ("Buzón de sugerencias")
CREATE TABLE public.suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_name TEXT,
  title TEXT,
  content TEXT NOT NULL CHECK (length(content) BETWEEN 3 AND 4000),
  category TEXT NOT NULL DEFAULT 'sugerencia'
    CHECK (category IN ('sugerencia','queja','idea','otro')),
  status TEXT NOT NULL DEFAULT 'unread'
    CHECK (status IN ('unread','read','resolved','archived')),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.suggestions TO authenticated;
GRANT ALL ON public.suggestions TO service_role;

ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can submit a suggestion (own user_id or null if anonymized).
CREATE POLICY "Authenticated users can submit suggestions"
  ON public.suggestions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Only admins can read suggestions (users cannot read theirs back — one-way inbox).
CREATE POLICY "Admins can read all suggestions"
  ON public.suggestions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update suggestion state (read/resolved/archived).
CREATE POLICY "Admins can update suggestions"
  ON public.suggestions
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX suggestions_status_created_idx
  ON public.suggestions (status, created_at DESC);

CREATE TRIGGER suggestions_set_updated_at
  BEFORE UPDATE ON public.suggestions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
