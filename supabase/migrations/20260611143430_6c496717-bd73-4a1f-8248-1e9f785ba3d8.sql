
-- ============ subscription_plans ============
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  price_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  deliveries_per_month INTEGER NOT NULL CHECK (deliveries_per_month > 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.subscription_plans TO anon, authenticated;
GRANT ALL ON public.subscription_plans TO service_role;

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans are public"
  ON public.subscription_plans FOR SELECT
  USING (active = true);

CREATE POLICY "Admins manage plans"
  ON public.subscription_plans FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER subscription_plans_touch
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.subscription_plans (price_id, name, price_cents, deliveries_per_month, sort_order)
VALUES
  ('plan_starter_monthly',      'Starter',      1499, 2, 1),
  ('plan_essential_monthly',    'Essential',    2999, 4, 2),
  ('plan_intermediate_monthly', 'Intermediate', 4499, 6, 3),
  ('plan_premium_monthly',      'Premium',      5999, 8, 4)
ON CONFLICT (price_id) DO UPDATE SET
  name = EXCLUDED.name,
  price_cents = EXCLUDED.price_cents,
  deliveries_per_month = EXCLUDED.deliveries_per_month,
  sort_order = EXCLUDED.sort_order;

-- ============ delivery_bookings ============
CREATE TABLE IF NOT EXISTS public.delivery_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  price_id TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  address TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','delivered','canceled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS delivery_bookings_user_period_idx
  ON public.delivery_bookings(user_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS delivery_bookings_date_idx
  ON public.delivery_bookings(scheduled_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_bookings TO authenticated;
GRANT ALL ON public.delivery_bookings TO service_role;

ALTER TABLE public.delivery_bookings ENABLE ROW LEVEL SECURITY;

-- Validate Mon/Fri at DB level via trigger (CHECK can't reference EXTRACT in some setups)
CREATE OR REPLACE FUNCTION public.validate_delivery_day()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXTRACT(DOW FROM NEW.scheduled_date) NOT IN (1, 5) THEN
    RAISE EXCEPTION 'Las entregas solo pueden ser lunes o viernes';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER delivery_bookings_validate_day
  BEFORE INSERT OR UPDATE ON public.delivery_bookings
  FOR EACH ROW EXECUTE FUNCTION public.validate_delivery_day();

CREATE TRIGGER delivery_bookings_touch
  BEFORE UPDATE ON public.delivery_bookings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "Users view own deliveries"
  ON public.delivery_bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create own deliveries"
  ON public.delivery_bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own deliveries"
  ON public.delivery_bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users delete own deliveries"
  ON public.delivery_bookings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
