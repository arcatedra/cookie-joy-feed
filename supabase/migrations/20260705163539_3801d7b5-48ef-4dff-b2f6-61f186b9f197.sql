
CREATE TABLE public.driver_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.courier_orders(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

GRANT SELECT, INSERT ON public.driver_ratings TO authenticated;
GRANT ALL ON public.driver_ratings TO service_role;
ALTER TABLE public.driver_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer can insert own rating"
  ON public.driver_ratings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Participants can view ratings"
  ON public.driver_ratings FOR SELECT TO authenticated
  USING (driver_id = auth.uid() OR customer_id = auth.uid());

CREATE TABLE public.order_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.courier_orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('customer','driver')),
  body TEXT NOT NULL,
  is_quick_reply BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.order_messages TO authenticated;
GRANT ALL ON public.order_messages TO service_role;
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view messages"
  ON public.order_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courier_orders o
      WHERE o.id = order_messages.order_id
        AND (o.driver_id = auth.uid() OR order_messages.sender_id = auth.uid())
    )
  );

CREATE POLICY "Participants send messages"
  ON public.order_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.courier_orders o
      WHERE o.id = order_messages.order_id
        AND (o.driver_id = auth.uid() OR sender_role = 'customer')
    )
  );

CREATE POLICY "Mark read by recipient"
  ON public.order_messages FOR UPDATE TO authenticated
  USING (sender_id <> auth.uid())
  WITH CHECK (sender_id <> auth.uid());

CREATE INDEX idx_order_messages_order ON public.order_messages(order_id, created_at);

ALTER TABLE public.courier_orders
  ADD COLUMN IF NOT EXISTS batch_id UUID,
  ADD COLUMN IF NOT EXISTS batch_position INTEGER;

CREATE INDEX IF NOT EXISTS idx_courier_orders_batch ON public.courier_orders(batch_id, batch_position) WHERE batch_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.update_driver_rating_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avg_rating NUMERIC;
BEGIN
  SELECT AVG(stars)::NUMERIC(3,2) INTO avg_rating
  FROM public.driver_ratings WHERE driver_id = NEW.driver_id;

  UPDATE public.drivers SET rating = COALESCE(avg_rating, 0) WHERE id = NEW.driver_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_driver_rating ON public.driver_ratings;
CREATE TRIGGER trg_update_driver_rating
AFTER INSERT ON public.driver_ratings
FOR EACH ROW EXECUTE FUNCTION public.update_driver_rating_stats();

ALTER PUBLICATION supabase_realtime ADD TABLE public.order_messages;
ALTER TABLE public.order_messages REPLICA IDENTITY FULL;
