ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS codigos_barras text[] NOT NULL DEFAULT '{}';
UPDATE public.store_products SET codigos_barras = ARRAY[codigo_barras]
  WHERE codigo_barras IS NOT NULL AND codigo_barras ~ '^\d{8,14}$' AND cardinality(codigos_barras) = 0;
CREATE INDEX IF NOT EXISTS store_products_codigos_barras_gin ON public.store_products USING gin (codigos_barras);

ALTER TABLE public.store_order_items
  ADD COLUMN IF NOT EXISTS pick_status text NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS scanned_barcode text,
  ADD COLUMN IF NOT EXISTS picked_weight_lb numeric,
  ADD COLUMN IF NOT EXISTS picked_at timestamptz,
  ADD COLUMN IF NOT EXISTS picked_by uuid,
  ADD COLUMN IF NOT EXISTS replacement_product_id uuid,
  ADD COLUMN IF NOT EXISTS replacement_name text;

CREATE OR REPLACE FUNCTION public.validate_store_item_pick()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.pick_status NOT IN ('pendiente','encontrado','reemplazado','no_habia') THEN
    RAISE EXCEPTION 'Estado de compra no válido';
  END IF;
  IF NEW.picked_weight_lb IS NOT NULL AND (NEW.picked_weight_lb <= 0 OR NEW.picked_weight_lb > 200) THEN
    RAISE EXCEPTION 'Peso no válido';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS validate_store_item_pick ON public.store_order_items;
CREATE TRIGGER validate_store_item_pick BEFORE INSERT OR UPDATE ON public.store_order_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_store_item_pick();