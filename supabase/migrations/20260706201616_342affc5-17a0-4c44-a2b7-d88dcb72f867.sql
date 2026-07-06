CREATE TABLE public.delivery_pricing_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  base_distance_miles NUMERIC(6,2) NOT NULL DEFAULT 3,
  base_fee NUMERIC(8,2) NOT NULL DEFAULT 7,
  extra_fee_per_mile NUMERIC(8,2) NOT NULL DEFAULT 1,
  max_standard_weight_kg NUMERIC(8,2) NOT NULL DEFAULT 20,
  heavy_handling_fee NUMERIC(8,2) NOT NULL DEFAULT 10,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT delivery_pricing_config_single_row CHECK (id = 'default')
);

GRANT SELECT ON public.delivery_pricing_config TO anon, authenticated;
GRANT ALL ON public.delivery_pricing_config TO service_role;

ALTER TABLE public.delivery_pricing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read delivery pricing"
  ON public.delivery_pricing_config FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify delivery pricing"
  ON public.delivery_pricing_config FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_delivery_pricing_config_updated_at
  BEFORE UPDATE ON public.delivery_pricing_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.delivery_pricing_config (id) VALUES ('default')
  ON CONFLICT (id) DO NOTHING;