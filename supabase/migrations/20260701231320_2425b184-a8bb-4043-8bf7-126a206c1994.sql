
-- Drop old trigger on subscriptions
DROP TRIGGER IF EXISTS subscriptions_grant_referral_reward ON public.subscriptions;
DROP FUNCTION IF EXISTS public.grant_referral_reward();

-- New function: grant 5 stars on referee's first daily draw entry
CREATE OR REPLACE FUNCTION public.grant_referral_reward_on_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ref RECORD;
BEGIN
  IF NEW.subject_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_ref FROM public.referrals
    WHERE referee_id = NEW.subject_user_id AND reward_granted = FALSE
    FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles
     SET stars_count = COALESCE(stars_count, 0) + 5
   WHERE id = v_ref.referrer_id;

  UPDATE public.referrals
     SET reward_granted = TRUE, rewarded_at = now()
   WHERE id = v_ref.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS daily_draw_entries_grant_referral_reward ON public.daily_draw_entries;
CREATE TRIGGER daily_draw_entries_grant_referral_reward
  AFTER INSERT ON public.daily_draw_entries
  FOR EACH ROW EXECUTE FUNCTION public.grant_referral_reward_on_entry();
