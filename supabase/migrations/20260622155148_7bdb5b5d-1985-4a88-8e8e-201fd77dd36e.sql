
-- Prize Pool: ledger of all star purchases (50/50 split tracking)
CREATE TABLE public.prize_pool_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id text NOT NULL,
  amount_usd numeric(10,2) NOT NULL CHECK (amount_usd > 0),
  tokens_purchased integer NOT NULL CHECK (tokens_purchased > 0),
  platform_share_usd numeric(10,2) NOT NULL,
  pool_share_usd numeric(10,2) NOT NULL,
  subject_user_id uuid,
  subject_email text,
  stripe_session_id text NOT NULL UNIQUE,
  stripe_payment_intent_id text,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.prize_pool_ledger TO authenticated;
GRANT ALL ON public.prize_pool_ledger TO service_role;

ALTER TABLE public.prize_pool_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contributions"
  ON public.prize_pool_ledger FOR SELECT TO authenticated
  USING (subject_user_id = auth.uid());

-- Public RPC to fetch the running pool total (readable by anyone, no row exposure)
CREATE OR REPLACE FUNCTION public.get_prize_pool()
RETURNS TABLE(total_pool_usd numeric, total_contributions bigint, last_updated timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(pool_share_usd), 0)::numeric AS total_pool_usd,
    COUNT(*)::bigint AS total_contributions,
    COALESCE(MAX(created_at), now()) AS last_updated
  FROM public.prize_pool_ledger;
$$;

GRANT EXECUTE ON FUNCTION public.get_prize_pool() TO anon, authenticated;

-- Track pending star checkouts so the webhook knows what to credit
CREATE TABLE public.star_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id text NOT NULL UNIQUE,
  package_id text NOT NULL,
  tokens integer NOT NULL,
  amount_usd numeric(10,2) NOT NULL,
  subject_user_id uuid,
  subject_email text,
  status text NOT NULL DEFAULT 'pending',
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.star_purchases TO authenticated;
GRANT ALL ON public.star_purchases TO service_role;

ALTER TABLE public.star_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own star purchases"
  ON public.star_purchases FOR SELECT TO authenticated
  USING (subject_user_id = auth.uid());

CREATE TRIGGER touch_star_purchases_updated_at
  BEFORE UPDATE ON public.star_purchases
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
