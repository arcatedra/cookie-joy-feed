
CREATE OR REPLACE FUNCTION public.grant_referral_reward_on_entry()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ref RECORD;
  v_today_count INT;
  v_month_count INT;
  v_now TIMESTAMPTZ := now();
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

  -- Anti-abuse caps aligned with Official Rules §4.3:
  -- max 10 successful referrals per referrer per calendar day
  -- max 100 successful referrals per referrer per calendar month
  SELECT COUNT(*) INTO v_today_count
    FROM public.referrals
   WHERE referrer_id = v_ref.referrer_id
     AND reward_granted = TRUE
     AND rewarded_at >= date_trunc('day', v_now)
     AND rewarded_at <  date_trunc('day', v_now) + INTERVAL '1 day';

  SELECT COUNT(*) INTO v_month_count
    FROM public.referrals
   WHERE referrer_id = v_ref.referrer_id
     AND reward_granted = TRUE
     AND rewarded_at >= date_trunc('month', v_now)
     AND rewarded_at <  date_trunc('month', v_now) + INTERVAL '1 month';

  IF v_today_count < 10 AND v_month_count < 100 THEN
    UPDATE public.profiles
       SET stars_count = COALESCE(stars_count, 0) + 5
     WHERE id = v_ref.referrer_id;
  END IF;

  -- Always mark as processed to prevent re-attempts (over-cap referrals are void).
  UPDATE public.referrals
     SET reward_granted = TRUE, rewarded_at = v_now
   WHERE id = v_ref.id;

  RETURN NEW;
END;
$function$;
