ALTER TABLE public.store_orders
  ADD COLUMN IF NOT EXISTS tramo text NOT NULL DEFAULT 'chico',
  ADD COLUMN IF NOT EXISTS envio_repartidor numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS envio_empresa numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS propina numeric NOT NULL DEFAULT 0;

INSERT INTO public.pricing_settings (key, value) VALUES
  ('tier_small_max_usd', 50),
  ('tier_medium_max_usd', 120),
  ('tier_small_fee_usd', 10),
  ('tier_small_driver_usd', 4),
  ('tier_small_company_usd', 6),
  ('tier_medium_fee_usd', 18),
  ('tier_medium_driver_usd', 6),
  ('tier_medium_company_usd', 12),
  ('tier_large_fee_usd', 35),
  ('tier_large_driver_usd', 10),
  ('tier_large_company_usd', 25),
  ('cutoff_hour_et', 20),
  ('delivery_days_mask', 42)
ON CONFLICT (key) DO NOTHING;