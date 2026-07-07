ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS stripe_account_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_status text NOT NULL DEFAULT 'no_iniciado'
    CHECK (stripe_onboarding_status IN ('no_iniciado','pendiente','completo','rechazado')),
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_updated_at timestamptz;

CREATE TABLE IF NOT EXISTS public.stripe_onboarding_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES public.drivers(id),
  stripe_event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.stripe_onboarding_events TO authenticated;
GRANT ALL ON public.stripe_onboarding_events TO service_role;

ALTER TABLE public.stripe_onboarding_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stripe_onboarding_events_admin_only" ON public.stripe_onboarding_events;
CREATE POLICY "stripe_onboarding_events_admin_only"
ON public.stripe_onboarding_events FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));