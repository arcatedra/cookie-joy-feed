ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS peso_kg numeric NOT NULL DEFAULT 0.5;
UPDATE public.store_products SET peso_kg = GREATEST(ROUND((COALESCE(peso_lb, 1) * 0.4536)::numeric, 2), 0.01);

ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS cargo_peso_repartidor numeric NOT NULL DEFAULT 0;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS peso_total_kg numeric NOT NULL DEFAULT 0;

INSERT INTO public.pricing_settings (key, value) VALUES
  ('weight_included_kg', 20),
  ('weight_extra_per_kg_usd', 1.50),
  ('weight_max_kg', 55),
  ('default_product_weight_kg', 0.5)
ON CONFLICT (key) DO NOTHING;