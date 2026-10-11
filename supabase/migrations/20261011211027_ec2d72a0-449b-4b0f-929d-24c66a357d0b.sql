ALTER TABLE public.store_products
  ADD COLUMN IF NOT EXISTS nombre_en text,
  ADD COLUMN IF NOT EXISTS precio_anterior numeric,
  ADD COLUMN IF NOT EXISTS tamano text,
  ADD COLUMN IF NOT EXISTS vendido_por_lb boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock integer;
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS reemplazo text NOT NULL DEFAULT 'similar';
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS is_house boolean NOT NULL DEFAULT false;

CREATE TABLE public.store_product_sourcing (
  product_id uuid PRIMARY KEY REFERENCES public.store_products(id) ON DELETE CASCADE,
  super text NOT NULL DEFAULT '',
  direccion text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_product_sourcing TO authenticated;
GRANT ALL ON public.store_product_sourcing TO service_role;
ALTER TABLE public.store_product_sourcing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin gestiona dónde comprar" ON public.store_product_sourcing FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Repartidor asignado ve dónde comprar" ON public.store_product_sourcing FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.store_order_items i JOIN public.store_orders o ON o.id = i.order_id
    WHERE i.product_id = store_product_sourcing.product_id AND o.repartidor_id = auth.uid()));
CREATE TRIGGER store_product_sourcing_touch BEFORE UPDATE ON public.store_product_sourcing
  FOR EACH ROW EXECUTE FUNCTION public.actualizar_timestamp();

DO $$
DECLARE v_owner uuid; v_biz uuid; v_frutas uuid; v_bebidas uuid;
BEGIN
  SELECT user_id INTO v_owner FROM public.user_roles WHERE role = 'admin' ORDER BY user_id LIMIT 1;
  IF v_owner IS NULL THEN RETURN; END IF;
  SELECT id INTO v_biz FROM public.businesses WHERE is_house LIMIT 1;
  IF v_biz IS NULL THEN
    INSERT INTO public.businesses (owner_user_id, business_name, business_type, email, phone, address, city, postal_code, status, slug, descripcion, activo, approved_at, is_house, comision_porcentaje)
    VALUES (v_owner, 'Hazorex Supermercado', 'supermercado', 'hazorex0@gmail.com', '3477441806', 'Queens', 'New York', '11432', 'aprobado', 'hazorex-supermercado', 'Supermercado de Hazorex: compramos por ti y te lo llevamos.', true, now(), true, 0)
    RETURNING id INTO v_biz;
  END IF;
  INSERT INTO public.store_categories (business_id, nombre, orden)
  SELECT v_biz, c.n, c.o FROM (VALUES ('Frutas y verduras',1),('Carnes y mariscos',2),('Lácteos y huevos',3),('Panadería',4),('Congelados',5),('Despensa',6),('Bebidas',7),('Snacks',8),('Limpieza',9),('Cuidado personal',10),('Bebé',11),('Mascotas',12)) AS c(n,o)
  WHERE NOT EXISTS (SELECT 1 FROM public.store_categories s WHERE s.business_id = v_biz AND s.nombre = c.n);
  SELECT id INTO v_frutas FROM public.store_categories WHERE business_id = v_biz AND nombre = 'Frutas y verduras';
  SELECT id INTO v_bebidas FROM public.store_categories WHERE business_id = v_biz AND nombre = 'Bebidas';
  IF NOT EXISTS (SELECT 1 FROM public.store_products WHERE business_id = v_biz) THEN
    WITH ins AS (
      INSERT INTO public.store_products (business_id, category_id, nombre, nombre_en, precio, unidad, tamano, peso_lb, vendido_por_lb, disponible, orden)
      VALUES
      (v_biz, v_frutas, 'Aguacate Hass grande', 'Large Hass avocado', 1.05, 'unidad', '1 unidad', 0.5, false, true, 1),
      (v_biz, v_frutas, 'Guineos / plátanos', 'Bananas', 0.83, 'lb', 'aprox. 2 lb', 2, true, true, 2),
      (v_biz, v_frutas, 'Uvas verdes sin semilla', 'Seedless green grapes', 2.09, 'lb', 'aprox. 2 lb', 2, true, true, 3),
      (v_biz, v_frutas, 'Fresas Driscoll''s', 'Driscoll''s strawberries', 3.50, 'unidad', '16 oz', 1, false, true, 4),
      (v_biz, v_frutas, 'Calabaza kabocha', 'Kabocha squash', 1.04, 'lb', 'aprox. 2 lb', 2, true, true, 5),
      (v_biz, v_frutas, 'Pimiento amarillo', 'Yellow bell pepper', 1.56, 'lb', 'aprox. 0.5 lb', 0.5, true, true, 6),
      (v_biz, v_bebidas, 'Agua Poland Spring 24 pk', 'Poland Spring water 24 pk', 4.90, 'unidad', '24 × 16.9 oz', 27, false, true, 7),
      (v_biz, v_bebidas, 'Schweppes Ginger Ale 12 pk', 'Schweppes Ginger Ale 12 pk', 6.30, 'unidad', '12 latas', 10, false, true, 8),
      (v_biz, v_bebidas, 'Jugo de manzana Apple & Eve', 'Apple & Eve apple juice', 3.15, 'unidad', '64 oz', 4.5, false, true, 9),
      (v_biz, v_bebidas, 'Red Bull sin azúcar 4 pk', 'Red Bull Sugarfree 4 pk', 13.11, 'unidad', '4 × 8.4 oz', 2.4, false, true, 10)
      RETURNING id
    )
    INSERT INTO public.store_product_sourcing (product_id, super, direccion) SELECT id, 'Food Bazaar', '' FROM ins;
  END IF;
END $$;