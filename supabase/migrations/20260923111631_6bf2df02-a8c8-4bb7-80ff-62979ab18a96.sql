ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS stripe_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.store_orders
  ADD COLUMN IF NOT EXISTS monto_transferido_negocio numeric,
  ADD COLUMN IF NOT EXISTS transferido_en timestamptz,
  ADD COLUMN IF NOT EXISTS transfer_id text;

INSERT INTO public.pricing_settings (key, value)
VALUES ('payout_frequency_days', 1)
ON CONFLICT (key) DO NOTHING;

UPDATE public.pricing_settings SET value = 0.70, updated_at = now()
WHERE key = 'weight_extra_per_lb_usd';

INSERT INTO public.pricing_settings (key, value)
VALUES ('weight_extra_per_lb_usd', 0.70)
ON CONFLICT (key) DO NOTHING;