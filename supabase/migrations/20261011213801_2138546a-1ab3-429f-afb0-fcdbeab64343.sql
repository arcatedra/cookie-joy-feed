ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS codigo_barras text, ADD COLUMN IF NOT EXISTS foto_credito text, ADD COLUMN IF NOT EXISTS foto_origen_url text, ADD COLUMN IF NOT EXISTS foto_licencia text;
COMMENT ON COLUMN public.store_products.codigo_barras IS 'Código de barras verificado del producto; mantener ceros iniciales.';
COMMENT ON COLUMN public.store_products.foto_credito IS 'Crédito público de la foto actual del producto.';
COMMENT ON COLUMN public.store_products.foto_origen_url IS 'Página pública del producto de Open Food Facts usada como fuente.';
COMMENT ON COLUMN public.store_products.foto_licencia IS 'Licencia de la foto actual; no describe datos privados de abastecimiento.';