ALTER TABLE public.delivery_block_stops ALTER COLUMN store_order_id DROP NOT NULL;
ALTER TABLE public.delivery_block_stops ADD COLUMN IF NOT EXISTS cookie_order_id uuid UNIQUE REFERENCES public.pedidos(id);
ALTER TABLE public.delivery_block_stops ADD COLUMN IF NOT EXISTS address_key text NOT NULL DEFAULT '';
ALTER TABLE public.delivery_block_stops ADD CONSTRAINT delivery_block_stops_one_order CHECK (num_nonnulls(store_order_id, cookie_order_id) = 1);
ALTER TABLE public.delivery_block_payout_parts ADD COLUMN IF NOT EXISTS cookie_order_id uuid REFERENCES public.pedidos(id);
CREATE POLICY block_stops_cookie_customer_read ON public.delivery_block_stops FOR SELECT TO authenticated
  USING (cookie_order_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = cookie_order_id AND p.cliente_id = auth.uid()));
CREATE INDEX IF NOT EXISTS delivery_block_stops_address_idx ON public.delivery_block_stops(block_id, address_key);