-- 1) Per-order earnings breakdown
CREATE TABLE IF NOT EXISTS public.driver_order_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.courier_orders(id) ON DELETE CASCADE,
  base_amount numeric(10,2) NOT NULL DEFAULT 0,
  tip_amount numeric(10,2) NOT NULL DEFAULT 0,
  bonus_amount numeric(10,2) NOT NULL DEFAULT 0,
  distance_amount numeric(10,2) NOT NULL DEFAULT 0,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  distance_km numeric(10,2),
  notes text,
  earned_at timestamptz NOT NULL DEFAULT now(),
  paid_out_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_order_earnings TO authenticated;
GRANT ALL ON public.driver_order_earnings TO service_role;

ALTER TABLE public.driver_order_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers view own order earnings"
  ON public.driver_order_earnings FOR SELECT TO authenticated
  USING (auth.uid() = driver_id);

CREATE POLICY "Admins view all order earnings"
  ON public.driver_order_earnings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage order earnings"
  ON public.driver_order_earnings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_order_earnings_driver ON public.driver_order_earnings(driver_id, earned_at DESC);

-- 2) Payout methods
CREATE TABLE IF NOT EXISTS public.driver_payout_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method_type text NOT NULL CHECK (method_type IN ('bank_transfer','paypal','yappy','other')),
  display_label text NOT NULL,
  account_holder text NOT NULL,
  account_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_payout_methods TO authenticated;
GRANT ALL ON public.driver_payout_methods TO service_role;

ALTER TABLE public.driver_payout_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers manage own payout methods"
  ON public.driver_payout_methods FOR ALL TO authenticated
  USING (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Admins view all payout methods"
  ON public.driver_payout_methods FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) Instant payout requests
CREATE TABLE IF NOT EXISTS public.driver_instant_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payout_method_id uuid REFERENCES public.driver_payout_methods(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  fee_amount numeric(10,2) NOT NULL DEFAULT 0,
  net_amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','paid','cancelled')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  reject_reason text,
  admin_notes text
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_instant_payouts TO authenticated;
GRANT ALL ON public.driver_instant_payouts TO service_role;

ALTER TABLE public.driver_instant_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers view own instant payouts"
  ON public.driver_instant_payouts FOR SELECT TO authenticated
  USING (auth.uid() = driver_id);

CREATE POLICY "Drivers request instant payouts"
  ON public.driver_instant_payouts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = driver_id AND status = 'pending');

CREATE POLICY "Drivers cancel own pending payouts"
  ON public.driver_instant_payouts FOR UPDATE TO authenticated
  USING (auth.uid() = driver_id AND status = 'pending')
  WITH CHECK (auth.uid() = driver_id AND status IN ('pending','cancelled'));

CREATE POLICY "Admins manage all instant payouts"
  ON public.driver_instant_payouts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_instant_payouts_driver ON public.driver_instant_payouts(driver_id, requested_at DESC);

-- 4) Ensure single default payout method per driver
CREATE OR REPLACE FUNCTION public.ensure_single_default_payout()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE public.driver_payout_methods
       SET is_default = false
     WHERE driver_id = NEW.driver_id
       AND id <> NEW.id
       AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_single_default_payout ON public.driver_payout_methods;
CREATE TRIGGER trg_single_default_payout
AFTER INSERT OR UPDATE OF is_default ON public.driver_payout_methods
FOR EACH ROW EXECUTE FUNCTION public.ensure_single_default_payout();

-- 5) Auto-create earnings row when an order is marked completado
CREATE OR REPLACE FUNCTION public.create_order_earnings_on_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completado'::courier_order_status
     AND (OLD.status IS NULL OR OLD.status <> 'completado'::courier_order_status)
     AND NEW.driver_id IS NOT NULL THEN
    INSERT INTO public.driver_order_earnings (
      driver_id, order_id, base_amount, total_amount, earned_at
    ) VALUES (
      NEW.driver_id, NEW.id, COALESCE(NEW.estimated_earnings, 0), COALESCE(NEW.estimated_earnings, 0), now()
    )
    ON CONFLICT (order_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_order_earnings_on_complete() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_order_earnings_on_complete ON public.courier_orders;
CREATE TRIGGER trg_order_earnings_on_complete
AFTER UPDATE OF status ON public.courier_orders
FOR EACH ROW EXECUTE FUNCTION public.create_order_earnings_on_complete();

-- 6) Backfill earnings for already-completed orders
INSERT INTO public.driver_order_earnings (driver_id, order_id, base_amount, total_amount, earned_at)
SELECT driver_id, id, COALESCE(estimated_earnings, 0), COALESCE(estimated_earnings, 0), COALESCE(updated_at, now())
FROM public.courier_orders
WHERE status = 'completado'::courier_order_status
  AND driver_id IS NOT NULL
ON CONFLICT (order_id) DO NOTHING;
