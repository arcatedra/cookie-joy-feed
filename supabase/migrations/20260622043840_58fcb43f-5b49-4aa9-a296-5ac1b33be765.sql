
-- USER TOKENS
CREATE TABLE public.user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_email TEXT,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_tokens_subject_chk CHECK ((user_id IS NOT NULL) <> (guest_email IS NOT NULL))
);
CREATE UNIQUE INDEX user_tokens_user_id_uq ON public.user_tokens(user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX user_tokens_guest_email_uq ON public.user_tokens(lower(guest_email)) WHERE guest_email IS NOT NULL;
GRANT SELECT ON public.user_tokens TO authenticated;
GRANT ALL ON public.user_tokens TO service_role;
ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own tokens" ON public.user_tokens FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- SPIN HISTORY
CREATE TABLE public.spin_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_email TEXT,
  prize_key TEXT NOT NULL,
  prize_label TEXT NOT NULL,
  coupon_code TEXT,
  tokens_spent INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX spin_history_user_idx ON public.spin_history(user_id);
CREATE INDEX spin_history_email_idx ON public.spin_history(lower(guest_email));
GRANT SELECT ON public.spin_history TO authenticated;
GRANT ALL ON public.spin_history TO service_role;
ALTER TABLE public.spin_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own spins" ON public.spin_history FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- AMOE ENTRIES
CREATE TABLE public.amoe_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  essay TEXT NOT NULL,
  ip INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX amoe_entries_email_uq ON public.amoe_entries(lower(email));
GRANT SELECT ON public.amoe_entries TO authenticated;
GRANT ALL ON public.amoe_entries TO service_role;
ALTER TABLE public.amoe_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own amoe" ON public.amoe_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- MISSION STARTS (when user opened the social link)
CREATE TABLE public.mission_starts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_email TEXT,
  mission_key TEXT NOT NULL CHECK (mission_key IN ('tiktok','instagram','facebook')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mission_starts_subject_chk CHECK ((user_id IS NOT NULL) <> (guest_email IS NOT NULL))
);
CREATE INDEX mission_starts_lookup_idx ON public.mission_starts(user_id, lower(guest_email), mission_key, started_at DESC);
GRANT ALL ON public.mission_starts TO service_role;
ALTER TABLE public.mission_starts ENABLE ROW LEVEL SECURITY;

-- MISSION CLAIMS
CREATE TABLE public.mission_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_email TEXT,
  mission_key TEXT NOT NULL CHECK (mission_key IN ('tiktok','instagram','facebook')),
  tokens_awarded INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT mission_claims_subject_chk CHECK ((user_id IS NOT NULL) <> (guest_email IS NOT NULL))
);
CREATE UNIQUE INDEX mission_claims_user_uq ON public.mission_claims(user_id, mission_key) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX mission_claims_guest_uq ON public.mission_claims(lower(guest_email), mission_key) WHERE guest_email IS NOT NULL;
GRANT SELECT ON public.mission_claims TO authenticated;
GRANT ALL ON public.mission_claims TO service_role;
ALTER TABLE public.mission_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own claims" ON public.mission_claims FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- SPIN COUPONS
CREATE TABLE public.spin_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  prize_key TEXT NOT NULL,
  subject_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject_email TEXT,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.spin_coupons TO authenticated;
GRANT ALL ON public.spin_coupons TO service_role;
ALTER TABLE public.spin_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own coupons" ON public.spin_coupons FOR SELECT TO authenticated USING (auth.uid() = subject_user_id);

-- updated_at trigger for user_tokens
CREATE TRIGGER user_tokens_touch_updated_at
  BEFORE UPDATE ON public.user_tokens
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
