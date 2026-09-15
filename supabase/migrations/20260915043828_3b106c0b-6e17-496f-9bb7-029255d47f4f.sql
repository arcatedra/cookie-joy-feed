
-- 1) Ampliar businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS descripcion text,
  ADD COLUMN IF NOT EXISTS horario jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS zonas_que_atiende text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS comision_porcentaje numeric NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true;

-- Backfill slug desde el nombre
UPDATE public.businesses b
   SET slug = sub.candidate
  FROM (
    SELECT id,
           regexp_replace(
             regexp_replace(lower(unaccent_fallback), '[^a-z0-9]+', '-', 'g'),
             '(^-+|-+$)', '', 'g'
           ) || CASE WHEN rn > 1 THEN '-' || rn::text ELSE '' END AS candidate
      FROM (
        SELECT id,
               business_name AS unaccent_fallback,
               row_number() OVER (PARTITION BY lower(business_name) ORDER BY created_at) AS rn
          FROM public.businesses
      ) t
  ) sub
 WHERE b.id = sub.id AND (b.slug IS NULL OR b.slug = '');

UPDATE public.businesses
   SET slug = 'tienda-' || left(id::text, 8)
 WHERE slug IS NULL OR slug = '';

CREATE UNIQUE INDEX IF NOT EXISTS businesses_slug_key ON public.businesses (slug);

-- 2) Categorías
CREATE TABLE IF NOT EXISTS public.store_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.store_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_categories TO authenticated;
GRANT ALL ON public.store_categories TO service_role;

ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Público ve categorías de tiendas aprobadas"
ON public.store_categories FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.businesses b
   WHERE b.id = store_categories.business_id
     AND b.status = 'aprobado' AND b.activo = true
));

CREATE POLICY "Dueño gestiona sus categorías"
ON public.store_categories FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.businesses b
   WHERE b.id = store_categories.business_id AND b.owner_user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.businesses b
   WHERE b.id = store_categories.business_id AND b.owner_user_id = auth.uid()
));

CREATE POLICY "Admin gestiona categorías"
ON public.store_categories FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_store_categories_updated_at
BEFORE UPDATE ON public.store_categories
FOR EACH ROW EXECUTE FUNCTION public.touch_businesses_updated_at();

CREATE INDEX IF NOT EXISTS store_categories_business_idx ON public.store_categories (business_id, orden);

-- 3) Productos
CREATE TABLE IF NOT EXISTS public.store_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.store_categories(id) ON DELETE SET NULL,
  nombre text NOT NULL,
  descripcion text,
  precio numeric NOT NULL DEFAULT 0,
  unidad text NOT NULL DEFAULT 'unidad',
  imagen_url text,
  disponible boolean NOT NULL DEFAULT true,
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.store_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_products TO authenticated;
GRANT ALL ON public.store_products TO service_role;

ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Público ve productos de tiendas aprobadas"
ON public.store_products FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.businesses b
   WHERE b.id = store_products.business_id
     AND b.status = 'aprobado' AND b.activo = true
));

CREATE POLICY "Dueño gestiona sus productos"
ON public.store_products FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.businesses b
   WHERE b.id = store_products.business_id AND b.owner_user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.businesses b
   WHERE b.id = store_products.business_id AND b.owner_user_id = auth.uid()
));

CREATE POLICY "Admin gestiona productos"
ON public.store_products FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_store_products_updated_at
BEFORE UPDATE ON public.store_products
FOR EACH ROW EXECUTE FUNCTION public.touch_businesses_updated_at();

CREATE INDEX IF NOT EXISTS store_products_business_idx ON public.store_products (business_id, orden);
