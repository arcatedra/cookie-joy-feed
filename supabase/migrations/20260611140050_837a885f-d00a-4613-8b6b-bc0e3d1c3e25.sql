
CREATE TABLE public.shipping_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_lat numeric(9,6) NOT NULL,
  from_lng numeric(9,6) NOT NULL,
  to_lat numeric(9,6) NOT NULL,
  to_lng numeric(9,6) NOT NULL,
  distance_miles numeric(10,2) NOT NULL,
  base_price numeric(10,2) NOT NULL,
  price_per_mile numeric(10,2) NOT NULL,
  total numeric(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.shipping_quotes TO authenticated;
GRANT ALL ON public.shipping_quotes TO service_role;

ALTER TABLE public.shipping_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own quotes"
  ON public.shipping_quotes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert their own quotes"
  ON public.shipping_quotes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX shipping_quotes_created_at_idx ON public.shipping_quotes (created_at DESC);
CREATE INDEX shipping_quotes_user_id_idx ON public.shipping_quotes (user_id);
