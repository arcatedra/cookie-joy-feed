
-- Delivery zones catalog
CREATE TABLE IF NOT EXISTS public.delivery_zones (
  id           text PRIMARY KEY,
  display_name text NOT NULL,
  active       boolean NOT NULL DEFAULT true
);

GRANT SELECT ON public.delivery_zones TO authenticated, anon;
GRANT ALL ON public.delivery_zones TO service_role;

ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delivery_zones_select_all"
ON public.delivery_zones FOR SELECT
USING (true);

INSERT INTO public.delivery_zones (id, display_name) VALUES
  ('jamaica', 'Jamaica'),
  ('rego_park', 'Rego Park')
ON CONFLICT (id) DO NOTHING;

-- Dispatch day enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dispatch_day') THEN
    CREATE TYPE public.dispatch_day AS ENUM ('lunes', 'viernes');
  END IF;
END$$;

-- Next dispatch date helper
CREATE OR REPLACE FUNCTION public.next_dispatch_date(p_from date, p_day public.dispatch_day)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  target_dow int;
  current_dow int;
  days_ahead int;
BEGIN
  target_dow := CASE p_day WHEN 'lunes' THEN 1 WHEN 'viernes' THEN 5 END;
  current_dow := EXTRACT(DOW FROM p_from)::int;
  days_ahead := (target_dow - current_dow + 7) % 7;
  RETURN p_from + days_ahead;
END;
$$;

-- Subscription orders
CREATE TABLE IF NOT EXISTS public.subscription_orders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  zone_id       text NOT NULL REFERENCES public.delivery_zones(id),
  delivery_day  public.dispatch_day NOT NULL,
  weight_kg     numeric(6,2) NOT NULL CHECK (weight_kg >= 0),
  status        text NOT NULL DEFAULT 'confirmado'
                CHECK (status IN ('confirmado', 'cancelado', 'despachado')),
  dispatch_date date,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_orders_zone_dispatch
  ON public.subscription_orders (zone_id, dispatch_date, delivery_day)
  WHERE status = 'confirmado';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_orders TO authenticated;
GRANT ALL ON public.subscription_orders TO service_role;

ALTER TABLE public.subscription_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_orders_select_own_or_admin"
ON public.subscription_orders FOR SELECT
TO authenticated
USING (
  auth.uid() = customer_id
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "subscription_orders_insert_own"
ON public.subscription_orders FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "subscription_orders_update_admin"
ON public.subscription_orders FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Auto-compute dispatch_date
CREATE OR REPLACE FUNCTION public.set_subscription_order_dispatch_date()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.dispatch_date := public.next_dispatch_date(CURRENT_DATE, NEW.delivery_day);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_dispatch_date ON public.subscription_orders;
CREATE TRIGGER trg_set_dispatch_date
  BEFORE INSERT ON public.subscription_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_subscription_order_dispatch_date();

-- Aggregate view
CREATE OR REPLACE VIEW public.v_zone_dispatch_summary
WITH (security_invoker = true)
AS
SELECT
  z.id                            AS zone_id,
  z.display_name                  AS zone_name,
  so.delivery_day,
  so.dispatch_date,
  COUNT(*)                        AS total_orders,
  COALESCE(SUM(so.weight_kg), 0)  AS total_weight_kg
FROM public.subscription_orders so
JOIN public.delivery_zones z ON z.id = so.zone_id
WHERE so.status = 'confirmado'
GROUP BY z.id, z.display_name, so.delivery_day, so.dispatch_date
ORDER BY so.dispatch_date, z.display_name;

GRANT SELECT ON public.v_zone_dispatch_summary TO authenticated;
