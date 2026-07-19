
-- ============================================================
-- HAZOREX: conectar app a tablas reales
-- ============================================================

-- 1) Auto-creación de fila en clientes al registrarse un usuario
CREATE OR REPLACE FUNCTION public.handle_new_cliente()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.clientes (id, nombre_completo, email)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      SPLIT_PART(NEW.email, '@', 1)
    ),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_cliente ON auth.users;
CREATE TRIGGER on_auth_user_created_cliente
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_cliente();

-- Backfill de usuarios existentes
INSERT INTO public.clientes (id, nombre_completo, email)
SELECT
  u.id,
  COALESCE(
    NULLIF(TRIM(u.raw_user_meta_data->>'name'), ''),
    NULLIF(TRIM(u.raw_user_meta_data->>'full_name'), ''),
    SPLIT_PART(u.email, '@', 1)
  ),
  u.email
FROM auth.users u
LEFT JOIN public.clientes c ON c.id = u.id
WHERE c.id IS NULL AND u.email IS NOT NULL;

-- 2) Semilla del catálogo de productos con UUIDs estables
INSERT INTO public.productos (id, nombre, descripcion, precio, categoria, imagen_url, disponible)
VALUES
  ('a1111111-0000-0000-0000-000000000001', 'Chocolate Chunk',            'Galleta clásica con trozos generosos de chocolate belga.',              3.75, 'cookies', NULL, true),
  ('a1111111-0000-0000-0000-000000000002', 'Snickerdoodle',              'Galleta suave con canela y azúcar, receta tradicional.',                3.75, 'cookies', NULL, true),
  ('a1111111-0000-0000-0000-000000000003', 'Oatmeal Raisin',             'Avena, pasas y un toque de vainilla. Masticable y reconfortante.',      3.75, 'cookies', NULL, true),
  ('a1111111-0000-0000-0000-000000000004', 'Mint Chocolate',             'Chocolate oscuro con menta fresca. Explosión de sabor.',                3.75, 'cookies', NULL, true),
  ('a1111111-0000-0000-0000-000000000005', 'Pistachio',                  'Pistacho tostado y toques de sal marina.',                              3.75, 'cookies', NULL, true),
  ('a1111111-0000-0000-0000-000000000006', 'Triple Chocolate',           'Tres tipos de chocolate: negro, con leche y blanco.',                   3.75, 'cookies', NULL, true),
  ('a1111111-0000-0000-0000-000000000007', 'M&M Festivo',                'Colorida galleta con chocolates M&M crujientes.',                       3.75, 'cookies', NULL, true),
  ('a1111111-0000-0000-0000-000000000008', 'Snicker',                    'Galleta rellena con trozos de Snickers, caramelo y maní.',              3.75, 'cookies', NULL, true),
  ('a1111111-0000-0000-0000-000000000009', 'Mantequilla de Maní Crujiente','Mantequilla de maní intensa con textura crujiente.',                  3.75, 'cookies', NULL, true),
  ('a1111111-0000-0000-0000-00000000000a', 'Chocolate Blanco y Macadamia','Chocolate blanco cremoso con nueces de macadamia.',                    3.75, 'cookies', NULL, true)
ON CONFLICT (id) DO NOTHING;

-- 3) Función atómica para crear pedido + items desde el webhook (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.crear_pedido_con_items(
  p_cliente_id uuid,
  p_direccion jsonb,
  p_subtotal numeric,
  p_envio numeric,
  p_impuestos numeric,
  p_total numeric,
  p_moneda text,
  p_stripe_pi text,
  p_stripe_session text,
  p_items jsonb
)
RETURNS TABLE(pedido_id uuid, numero_pedido text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido_id uuid;
  v_numero    text;
  v_item      jsonb;
BEGIN
  -- Idempotencia: si ya existe un pedido con ese payment_intent, devuélvelo
  SELECT p.id, p.numero_pedido
    INTO v_pedido_id, v_numero
    FROM public.pedidos p
   WHERE p_stripe_pi IS NOT NULL AND p.stripe_payment_intent_id = p_stripe_pi
   LIMIT 1;

  IF v_pedido_id IS NOT NULL THEN
    pedido_id := v_pedido_id;
    numero_pedido := v_numero;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.pedidos (
    cliente_id, estado, subtotal, costo_envio, impuestos, total,
    moneda, direccion_envio, metodo_pago,
    stripe_payment_intent_id, stripe_checkout_session_id
  )
  VALUES (
    p_cliente_id, 'pagado', p_subtotal, p_envio, p_impuestos, p_total,
    COALESCE(p_moneda, 'USD'), p_direccion, 'stripe',
    p_stripe_pi, p_stripe_session
  )
  RETURNING id, pedidos.numero_pedido INTO v_pedido_id, v_numero;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.pedido_items (
      pedido_id, producto_id, nombre_producto,
      precio_unitario, cantidad, subtotal_item
    ) VALUES (
      v_pedido_id,
      NULLIF(v_item->>'producto_id','')::uuid,
      COALESCE(v_item->>'nombre_producto','Producto'),
      (v_item->>'precio_unitario')::numeric,
      (v_item->>'cantidad')::int,
      (v_item->>'precio_unitario')::numeric * (v_item->>'cantidad')::int
    );
  END LOOP;

  pedido_id := v_pedido_id;
  numero_pedido := v_numero;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.crear_pedido_con_items(uuid,jsonb,numeric,numeric,numeric,numeric,text,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crear_pedido_con_items(uuid,jsonb,numeric,numeric,numeric,numeric,text,text,text,jsonb) TO service_role;

-- 4) Índice y constraint suave para suscripciones
CREATE UNIQUE INDEX IF NOT EXISTS suscripciones_stripe_sub_id_key
  ON public.suscripciones(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS pedidos_cliente_creado_idx
  ON public.pedidos(cliente_id, creado_en DESC);

-- 5) Función SECURITY DEFINER para upsert de suscripciones desde webhook
CREATE OR REPLACE FUNCTION public.upsert_suscripcion_stripe(
  p_cliente_id uuid,
  p_stripe_sub_id text,
  p_plan text,
  p_precio numeric,
  p_moneda text,
  p_estado text,
  p_fecha_inicio timestamptz,
  p_fecha_renovacion timestamptz,
  p_fecha_cancelacion timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.suscripciones (
    cliente_id, stripe_subscription_id, plan, precio, moneda,
    estado, fecha_inicio, fecha_renovacion, fecha_cancelacion
  ) VALUES (
    p_cliente_id, p_stripe_sub_id, p_plan, p_precio, COALESCE(p_moneda,'USD'),
    p_estado, p_fecha_inicio, p_fecha_renovacion, p_fecha_cancelacion
  )
  ON CONFLICT (stripe_subscription_id)
  DO UPDATE SET
    estado = EXCLUDED.estado,
    precio = EXCLUDED.precio,
    fecha_renovacion = EXCLUDED.fecha_renovacion,
    fecha_cancelacion = EXCLUDED.fecha_cancelacion,
    actualizado_en = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_suscripcion_stripe(uuid,text,text,numeric,text,text,timestamptz,timestamptz,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_suscripcion_stripe(uuid,text,text,numeric,text,text,timestamptz,timestamptz,timestamptz) TO service_role;
