ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS descripcion_en text, ADD COLUMN IF NOT EXISTS subcategoria text;
GRANT SELECT (descripcion_en, subcategoria) ON public.store_products TO anon;
GRANT SELECT, INSERT, UPDATE (descripcion_en, subcategoria) ON public.store_products TO authenticated;
GRANT SELECT, INSERT, UPDATE (descripcion_en, subcategoria) ON public.store_products TO service_role;
ALTER TABLE public.store_products ADD CONSTRAINT store_products_subcategoria_valid CHECK (subcategoria IS NULL OR subcategoria IN ('Frutas', 'Verduras'));
COMMENT ON COLUMN public.store_products.subcategoria IS 'Subcategoría opcional del catálogo: Frutas o Verduras dentro de Frutas y verduras.';