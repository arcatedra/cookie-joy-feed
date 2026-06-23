
-- 1. Generator function for short unique referral codes
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  alphabet TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0,O,1,I
  code TEXT;
  i INT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..8 LOOP
      code := code || substr(alphabet, 1 + floor(random()*length(alphabet))::int, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END;
$$;

-- 2. Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stars_count INTEGER NOT NULL DEFAULT 0;

-- Backfill referral codes for existing users
UPDATE public.profiles SET referral_code = public.generate_referral_code() WHERE referral_code IS NULL;

ALTER TABLE public.profiles ALTER COLUMN referral_code SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN referral_code SET DEFAULT public.generate_referral_code();

-- 3. Referrals tracking table
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referee_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_granted BOOLEAN NOT NULL DEFAULT FALSE,
  rewarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (referee_id)
);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON public.referrals(referrer_id);

GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referrals_select_own" ON public.referrals;
CREATE POLICY "referrals_select_own" ON public.referrals
  FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

-- 4. Lookup function: resolve a referral code to a referrer user_id (safe, no PII).
CREATE OR REPLACE FUNCTION public.resolve_referral_code(p_code TEXT)
RETURNS TABLE(referrer_id UUID, display_name TEXT)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name
  FROM public.profiles p
  WHERE p.referral_code = upper(p_code)
    AND p.deleted_at IS NULL
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_referral_code(TEXT) TO anon, authenticated;

-- 5. Block users from editing referral_code or stars_count themselves
CREATE OR REPLACE FUNCTION public.profiles_protect_referral_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_name TEXT := current_setting('request.jwt.claim.role', true);
BEGIN
  IF role_name = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.referral_code IS DISTINCT FROM OLD.referral_code THEN
    RAISE EXCEPTION 'referral_code is read-only';
  END IF;
  IF NEW.stars_count IS DISTINCT FROM OLD.stars_count THEN
    RAISE EXCEPTION 'stars_count can only be modified by the system';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_referral_fields ON public.profiles;
CREATE TRIGGER profiles_protect_referral_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_protect_referral_fields();

-- 6. Update handle_new_user to assign referral_code and register the referral relation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_name TEXT := COALESCE(meta->>'name', meta->>'full_name', split_part(NEW.email, '@', 1));
  v_region TEXT := NULLIF(meta->>'region', '');
  v_terms BOOLEAN := COALESCE((meta->>'terms_accepted')::boolean, FALSE);
  v_ref_code TEXT := upper(NULLIF(meta->>'referral_code', ''));
  v_referrer UUID;
  v_new_code TEXT := public.generate_referral_code();
BEGIN
  INSERT INTO public.profiles (id, display_name, full_name, email, region, terms_accepted, referral_code)
  VALUES (NEW.id, v_name, v_name, NEW.email, v_region, v_terms, v_new_code)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
        region = COALESCE(public.profiles.region, EXCLUDED.region),
        terms_accepted = public.profiles.terms_accepted OR EXCLUDED.terms_accepted;

  -- Record referral relationship if referral code is valid and not self
  IF v_ref_code IS NOT NULL THEN
    SELECT id INTO v_referrer FROM public.profiles
      WHERE referral_code = v_ref_code AND deleted_at IS NULL;
    IF v_referrer IS NOT NULL AND v_referrer <> NEW.id THEN
      INSERT INTO public.referrals (referrer_id, referee_id)
      VALUES (v_referrer, NEW.id)
      ON CONFLICT (referee_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 7. Reward function: grant 3 stars to referrer when referee completes their first subscription
CREATE OR REPLACE FUNCTION public.grant_referral_reward()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref RECORD;
BEGIN
  -- Only on subscriptions that are active/trialing
  IF NEW.status NOT IN ('active','trialing') THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_ref FROM public.referrals
    WHERE referee_id = NEW.user_id AND reward_granted = FALSE
    FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles
     SET stars_count = COALESCE(stars_count, 0) + 3
   WHERE id = v_ref.referrer_id;

  UPDATE public.referrals
     SET reward_granted = TRUE, rewarded_at = now()
   WHERE id = v_ref.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS subscriptions_grant_referral_reward ON public.subscriptions;
CREATE TRIGGER subscriptions_grant_referral_reward
AFTER INSERT OR UPDATE OF status ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.grant_referral_reward();
