
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS repartidor_id uuid;
CREATE INDEX IF NOT EXISTS idx_store_orders_repartidor ON public.store_orders(repartidor_id);
