
-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  region TEXT,
  terms_accepted BOOLEAN NOT NULL DEFAULT false,
  terms_accepted_at TIMESTAMPTZ,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  donation_tier TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ============================================================
-- FAVORITES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_handle TEXT NOT NULL,
  product_title TEXT,
  product_image_url TEXT,
  product_price_amount NUMERIC,
  product_price_currency TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_handle)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favorites_manage_own" ON public.favorites
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- STAR PURCHASES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.star_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject_email TEXT,
  package_id TEXT NOT NULL,
  tokens INTEGER NOT NULL,
  amount_usd NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS star_purchases_subject_user_idx
  ON public.star_purchases (subject_user_id, created_at DESC);

GRANT SELECT ON public.star_purchases TO authenticated;
GRANT ALL ON public.star_purchases TO service_role;

ALTER TABLE public.star_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "star_purchases_select_own" ON public.star_purchases
  FOR SELECT TO authenticated USING (auth.uid() = subject_user_id);
CREATE POLICY "star_purchases_service_all" ON public.star_purchases
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- REFERRALS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referee_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reward_granted BOOLEAN NOT NULL DEFAULT false,
  rewarded_at TIMESTAMPTZ,
  CHECK (referrer_id <> referee_id)
);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx
  ON public.referrals (referrer_id, invited_at DESC);

GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referrals_select_own" ON public.referrals
  FOR SELECT TO authenticated USING (auth.uid() = referrer_id);
CREATE POLICY "referrals_service_all" ON public.referrals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- USER ELIGIBILITY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_eligibility (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dob DATE NOT NULL,
  state TEXT NOT NULL,
  verified_age INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.user_eligibility TO authenticated;
GRANT ALL ON public.user_eligibility TO service_role;

ALTER TABLE public.user_eligibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_eligibility_manage_own" ON public.user_eligibility
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- REFERRAL CODE HELPER
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  out TEXT;
  i INT;
  attempts INT := 0;
BEGIN
  LOOP
    out := '';
    FOR i IN 1..8 LOOP
      out := out || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = out);
    attempts := attempts + 1;
    IF attempts > 10 THEN
      out := out || substr(md5(random()::text || clock_timestamp()::text), 1, 4);
      EXIT;
    END IF;
  END LOOP;
  RETURN out;
END;
$$;

-- ============================================================
-- NEW USER TRIGGER: create profile + record referral
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_ref_code TEXT;
  v_referrer UUID;
  v_terms BOOLEAN;
BEGIN
  v_code := public.generate_referral_code();
  v_ref_code := NULLIF(TRIM(NEW.raw_user_meta_data->>'referral_code'), '');
  v_terms := COALESCE((NEW.raw_user_meta_data->>'terms_accepted')::boolean, false);

  IF v_ref_code IS NOT NULL THEN
    SELECT id INTO v_referrer FROM public.profiles WHERE referral_code = upper(v_ref_code) LIMIT 1;
    IF v_referrer = NEW.id THEN v_referrer := NULL; END IF;
  END IF;

  INSERT INTO public.profiles (id, name, region, terms_accepted, terms_accepted_at, referral_code, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''), NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), '')),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'region'), ''),
    v_terms,
    CASE WHEN v_terms THEN now() ELSE NULL END,
    v_code,
    v_referrer
  )
  ON CONFLICT (id) DO UPDATE
    SET referral_code = COALESCE(public.profiles.referral_code, EXCLUDED.referral_code);

  IF v_referrer IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referee_id)
    VALUES (v_referrer, NEW.id)
    ON CONFLICT (referee_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- ============================================================
-- BACKFILL: create profile rows for existing users
-- ============================================================
INSERT INTO public.profiles (id, name, referral_code)
SELECT
  u.id,
  COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'name'), ''), NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''), split_part(u.email, '@', 1)),
  public.generate_referral_code()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- ============================================================
-- RPC: get_my_referral_profile
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_referral_profile()
RETURNS TABLE (referral_code TEXT, stars_count INTEGER, invited_count INTEGER)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_code TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT p.referral_code INTO v_code FROM public.profiles p WHERE p.id = v_uid;

  IF v_code IS NULL THEN
    v_code := public.generate_referral_code();
    INSERT INTO public.profiles (id, referral_code)
    VALUES (v_uid, v_code)
    ON CONFLICT (id) DO UPDATE SET referral_code = COALESCE(public.profiles.referral_code, EXCLUDED.referral_code)
    RETURNING public.profiles.referral_code INTO v_code;
  END IF;

  RETURN QUERY
  SELECT
    v_code,
    COALESCE((SELECT COUNT(*)::int * 5 FROM public.referrals r WHERE r.referrer_id = v_uid AND r.reward_granted), 0),
    COALESCE((SELECT COUNT(*)::int FROM public.referrals r WHERE r.referrer_id = v_uid), 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_referral_profile() TO authenticated;

-- ============================================================
-- RPC: get_my_referrals
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_referrals()
RETURNS TABLE (
  referee_display_name TEXT,
  invited_at TIMESTAMPTZ,
  reward_granted BOOLEAN,
  rewarded_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(NULLIF(TRIM(SPLIT_PART(c.nombre_completo, ' ', 1)), ''), 'Amigo') AS referee_display_name,
    r.invited_at,
    r.reward_granted,
    r.rewarded_at
  FROM public.referrals r
  LEFT JOIN public.clientes c ON c.id = r.referee_id
  WHERE r.referrer_id = auth.uid()
  ORDER BY r.invited_at DESC
  LIMIT 100;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_referrals() TO authenticated;
