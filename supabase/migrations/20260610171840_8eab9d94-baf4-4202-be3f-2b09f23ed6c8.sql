-- Enum for donation tiers
CREATE TYPE public.donation_tier AS ENUM (
  'azul',
  'bronce',
  'oro',
  'premium',
  'corona',
  'estrella_suprema'
);

-- Donations table
CREATE TABLE public.donations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  tier public.donation_tier NOT NULL,
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.donations TO authenticated;
GRANT ALL ON public.donations TO service_role;

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Users can read their own donations
CREATE POLICY "Users can view their own donations"
ON public.donations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies for authenticated users:
-- only the webhook (service_role) can write donations after verifying Stripe payment.

CREATE INDEX donations_user_id_idx ON public.donations(user_id);
CREATE INDEX donations_created_at_idx ON public.donations(created_at DESC);

CREATE TRIGGER donations_touch_updated_at
BEFORE UPDATE ON public.donations
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Add current tier to profiles (highest tier ever donated)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS donation_tier public.donation_tier;