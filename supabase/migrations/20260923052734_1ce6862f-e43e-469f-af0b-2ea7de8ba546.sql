-- 1) Peso en productos y campos nuevos en pedidos de tienda
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS peso_lb NUMERIC NOT NULL DEFAULT 1;
ALTER TABLE public.store_orders
  ADD COLUMN IF NOT EXISTS peso_total_lb NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cargo_servicio NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cargo_peso NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fecha_entrega DATE,
  ADD COLUMN IF NOT EXISTS credito_aplicado NUMERIC NOT NULL DEFAULT 0;

-- proteger tambien los montos nuevos
CREATE OR REPLACE FUNCTION public.store_orders_protect_money()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  role_name TEXT := current_setting('request.jwt.claim.role', true);
BEGIN
  NEW.updated_at := now();
  IF role_name = 'service_role' OR auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN RETURN NEW; END IF;

  IF NEW.subtotal IS DISTINCT FROM OLD.subtotal
     OR NEW.costo_envio IS DISTINCT FROM OLD.costo_envio
     OR NEW.total_estimado IS DISTINCT FROM OLD.total_estimado
     OR NEW.monto_autorizado IS DISTINCT FROM OLD.monto_autorizado
     OR NEW.monto_capturado IS DISTINCT FROM OLD.monto_capturado
     OR NEW.comision_porcentaje IS DISTINCT FROM OLD.comision_porcentaje
     OR NEW.comision_estimada IS DISTINCT FROM OLD.comision_estimada
     OR NEW.comision_final IS DISTINCT FROM OLD.comision_final
     OR NEW.ajuste_pendiente IS DISTINCT FROM OLD.ajuste_pendiente
     OR NEW.cargo_servicio IS DISTINCT FROM OLD.cargo_servicio
     OR NEW.cargo_peso IS DISTINCT FROM OLD.cargo_peso
     OR NEW.credito_aplicado IS DISTINCT FROM OLD.credito_aplicado
     OR NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id
     OR NEW.stripe_checkout_session_id IS DISTINCT FROM OLD.stripe_checkout_session_id
     OR NEW.autorizado_en IS DISTINCT FROM OLD.autorizado_en
     OR NEW.capturado_en IS DISTINCT FROM OLD.capturado_en
     OR NEW.captura_intentos IS DISTINCT FROM OLD.captura_intentos
     OR NEW.cliente_id IS DISTINCT FROM OLD.cliente_id
     OR NEW.business_id IS DISTINCT FROM OLD.business_id
  THEN
    RAISE EXCEPTION 'Los montos y datos de pago del pedido solo los cambia el sistema';
  END IF;

  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.store_orders_protect_money() FROM anon, authenticated, public;

-- 2) Precios configurables
CREATE TABLE IF NOT EXISTS public.pricing_settings (
  key TEXT PRIMARY KEY,
  value NUMERIC NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pricing_settings TO anon, authenticated;
GRANT ALL ON public.pricing_settings TO service_role;
ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pricing_settings_read" ON public.pricing_settings;
CREATE POLICY "pricing_settings_read" ON public.pricing_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "pricing_settings_admin_write" ON public.pricing_settings;
CREATE POLICY "pricing_settings_admin_write" ON public.pricing_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.pricing_settings (key, value) VALUES
  ('service_min_usd', 15),
  ('service_pct', 18),
  ('weight_included_lb', 45),
  ('weight_tier2_max_lb', 80),
  ('weight_tier2_fee_usd', 5),
  ('weight_tier3_max_lb', 120),
  ('weight_tier3_fee_usd', 9),
  ('weight_max_lb', 120),
  ('default_product_weight_lb', 1),
  ('driver_per_stop_usd', 5.50),
  ('driver_per_item_usd', 0.10),
  ('driver_item_threshold', 30),
  ('driver_weight_share_pct', 60),
  ('driver_tip_share_pct', 100),
  ('referral_bonus_usd', 5)
ON CONFLICT (key) DO NOTHING;

-- 3) Dias de ruta por zona
CREATE TABLE IF NOT EXISTS public.zone_delivery_days (
  zone TEXT PRIMARY KEY,
  days INTEGER[] NOT NULL DEFAULT '{1,5}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.zone_delivery_days TO anon, authenticated;
GRANT ALL ON public.zone_delivery_days TO service_role;
ALTER TABLE public.zone_delivery_days ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "zone_days_read" ON public.zone_delivery_days;
CREATE POLICY "zone_days_read" ON public.zone_delivery_days FOR SELECT USING (true);
DROP POLICY IF EXISTS "zone_days_admin_write" ON public.zone_delivery_days;
CREATE POLICY "zone_days_admin_write" ON public.zone_delivery_days FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 4) Saldo del usuario
CREATE TABLE IF NOT EXISTS public.wallet_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount_usd NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  order_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wallet_credits_user_idx ON public.wallet_credits(user_id, created_at DESC);
GRANT SELECT ON public.wallet_credits TO authenticated;
GRANT ALL ON public.wallet_credits TO service_role;
ALTER TABLE public.wallet_credits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wallet_credits_own_read" ON public.wallet_credits;
CREATE POLICY "wallet_credits_own_read" ON public.wallet_credits FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.get_my_credit_balance()
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount_usd), 0)::numeric
  FROM public.wallet_credits
  WHERE user_id = auth.uid();
$$;

-- 5) Bonos de referido
CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referee_id UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pendiente',
  block_reason TEXT,
  order_id UUID,
  amount_usd NUMERIC NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS referral_rewards_referrer_idx ON public.referral_rewards(referrer_id);
GRANT SELECT ON public.referral_rewards TO authenticated;
GRANT ALL ON public.referral_rewards TO service_role;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "referral_rewards_own_read" ON public.referral_rewards;
CREATE POLICY "referral_rewards_own_read" ON public.referral_rewards FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- 6) Huellas de cuenta (antifraude)
CREATE TABLE IF NOT EXISTS public.account_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  kind TEXT NOT NULL,
  value_norm TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, value_norm)
);
CREATE INDEX IF NOT EXISTS account_fingerprints_value_idx ON public.account_fingerprints(kind, value_norm);
GRANT SELECT ON public.account_fingerprints TO authenticated;
GRANT ALL ON public.account_fingerprints TO service_role;
ALTER TABLE public.account_fingerprints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "account_fingerprints_admin_read" ON public.account_fingerprints;
CREATE POLICY "account_fingerprints_admin_read" ON public.account_fingerprints FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));