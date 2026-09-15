CREATE TABLE IF NOT EXISTS public.policy_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid,
  user_id uuid NOT NULL,
  role text NOT NULL,
  texto_intentado text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.policy_violations TO authenticated;
GRANT ALL ON public.policy_violations TO service_role;

ALTER TABLE public.policy_violations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins ven las violaciones" ON public.policy_violations;
CREATE POLICY "Admins ven las violaciones" ON public.policy_violations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS policy_violations_created_at_idx ON public.policy_violations (created_at DESC);