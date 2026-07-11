
CREATE TABLE public.user_eligibility (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dob DATE NOT NULL,
  state TEXT NOT NULL CHECK (char_length(state) = 2),
  verified_age INT NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.user_eligibility TO authenticated;
GRANT ALL ON public.user_eligibility TO service_role;

ALTER TABLE public.user_eligibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own eligibility"
  ON public.user_eligibility FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own eligibility"
  ON public.user_eligibility FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE policy on purpose: once verified, DOB/state should not change silently.
-- Admin/service_role bypasses RLS for corrections.

CREATE TRIGGER update_user_eligibility_updated_at
  BEFORE UPDATE ON public.user_eligibility
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
