CREATE TABLE IF NOT EXISTS public.csp_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint text NOT NULL UNIQUE,
  directive text NOT NULL,
  blocked_uri text,
  source_file text,
  line_number integer,
  column_number integer,
  sample text,
  document_url text,
  user_agent text,
  disposition text,
  occurrence_count integer NOT NULL DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_alert_sent_at timestamptz
);

GRANT SELECT ON public.csp_violations TO authenticated;
GRANT ALL ON public.csp_violations TO service_role;

ALTER TABLE public.csp_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read CSP violations"
  ON public.csp_violations
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_csp_violations_directive ON public.csp_violations(directive);
CREATE INDEX IF NOT EXISTS idx_csp_violations_last_seen ON public.csp_violations(last_seen_at DESC);
