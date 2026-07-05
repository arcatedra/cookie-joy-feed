ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS agreement_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS tutorial_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_lat double precision,
  ADD COLUMN IF NOT EXISTS last_lng double precision,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS went_online_at timestamptz;

ALTER TABLE public.courier_orders REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'courier_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.courier_orders;
  END IF;
END $$;

DROP POLICY IF EXISTS "Approved drivers can view available orders" ON public.courier_orders;
CREATE POLICY "Approved drivers can view available orders"
ON public.courier_orders
FOR SELECT
TO authenticated
USING (
  status = 'disponible'::courier_order_status
  AND driver_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.drivers d
    WHERE d.id = auth.uid()
      AND d.application_status = 'aprobado'::driver_application_status
  )
);
