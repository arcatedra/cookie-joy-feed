-- ============ Pedidos del marketplace de tiendas ============
CREATE TABLE public.store_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_pedido TEXT NOT NULL DEFAULT ('HZX-T-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8))),
  business_id UUID NOT NULL REFERENCES public.businesses(id),
  cliente_id UUID NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente_pago',
  direccion_envio JSONB NOT NULL DEFAULT '{}'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  costo_envio NUMERIC NOT NULL DEFAULT 0,
  total_estimado NUMERIC NOT NULL DEFAULT 0,
  monto_autorizado NUMERIC,
  monto_capturado NUMERIC,
  comision_porcentaje NUMERIC NOT NULL DEFAULT 15,
  comision_estimada NUMERIC NOT NULL DEFAULT 0,
  comision_final NUMERIC,
  ajuste_pendiente NUMERIC NOT NULL DEFAULT 0,
  moneda TEXT NOT NULL DEFAULT 'USD',
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  autorizado_en TIMESTAMPTZ,
  capturado_en TIMESTAMPTZ,
  captura_intentos INTEGER NOT NULL DEFAULT 0,
  captura_error TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX store_orders_numero_key ON public.store_orders(numero_pedido);
CREATE INDEX store_orders_business_idx ON public.store_orders(business_id, created_at DESC);
CREATE INDEX store_orders_cliente_idx ON public.store_orders(cliente_id, created_at DESC);
CREATE INDEX store_orders_pi_idx ON public.store_orders(stripe_payment_intent_id);

GRANT SELECT, INSERT, UPDATE ON public.store_orders TO authenticated;
GRANT ALL ON public.store_orders TO service_role;

ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clientes ven sus pedidos de tienda"
  ON public.store_orders FOR SELECT TO authenticated
  USING (cliente_id = auth.uid());

CREATE POLICY "Clientes crean sus pedidos de tienda"
  ON public.store_orders FOR INSERT TO authenticated
  WITH CHECK (cliente_id = auth.uid() AND estado = 'pendiente_pago');

CREATE POLICY "Tiendas ven sus pedidos"
  ON public.store_orders FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.businesses b
     WHERE b.id = store_orders.business_id AND b.owner_user_id = auth.uid()
  ));

CREATE POLICY "Tiendas actualizan sus pedidos"
  ON public.store_orders FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.businesses b
     WHERE b.id = store_orders.business_id AND b.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.businesses b
     WHERE b.id = store_orders.business_id AND b.owner_user_id = auth.uid()
  ));

CREATE POLICY "Admins gestionan pedidos de tienda"
  ON public.store_orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ Artículos del pedido ============
CREATE TABLE public.store_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.store_products(id),
  nombre_producto TEXT NOT NULL,
  unidad TEXT NOT NULL DEFAULT 'unidad',
  precio_unitario NUMERIC NOT NULL,
  cantidad NUMERIC NOT NULL,
  cantidad_real NUMERIC,
  subtotal_item NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX store_order_items_order_idx ON public.store_order_items(order_id);

GRANT SELECT, INSERT, UPDATE ON public.store_order_items TO authenticated;
GRANT ALL ON public.store_order_items TO service_role;

ALTER TABLE public.store_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clientes ven los articulos de sus pedidos"
  ON public.store_order_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.store_orders o
     WHERE o.id = store_order_items.order_id AND o.cliente_id = auth.uid()
  ));

CREATE POLICY "Clientes agregan articulos a sus pedidos"
  ON public.store_order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.store_orders o
     WHERE o.id = store_order_items.order_id
       AND o.cliente_id = auth.uid()
       AND o.estado = 'pendiente_pago'
  ));

CREATE POLICY "Tiendas ven y ajustan los articulos de sus pedidos"
  ON public.store_order_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.store_orders o
      JOIN public.businesses b ON b.id = o.business_id
     WHERE o.id = store_order_items.order_id AND b.owner_user_id = auth.uid()
  ));

CREATE POLICY "Tiendas actualizan los articulos de sus pedidos"
  ON public.store_order_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.store_orders o
      JOIN public.businesses b ON b.id = o.business_id
     WHERE o.id = store_order_items.order_id AND b.owner_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.store_orders o
      JOIN public.businesses b ON b.id = o.business_id
     WHERE o.id = store_order_items.order_id AND b.owner_user_id = auth.uid()
  ));

CREATE POLICY "Admins gestionan articulos de pedidos de tienda"
  ON public.store_order_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ Protección de montos y campos de pago ============
CREATE OR REPLACE FUNCTION public.store_orders_protect_money()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_name TEXT := current_setting('request.jwt.claim.role', true);
BEGIN
  NEW.updated_at := now();
  IF role_name = 'service_role' OR auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN RETURN NEW; END IF;

  IF NEW.subtotal IS DISTINCT FROM OLD.subtotal
     OR NEW.costo_envio IS DISTINCT FROM OLD.costo_envio
     OR NEW.total_estimado IS DISTINCT FROM OLD.total_estimado
     OR NEW.monto_autorizado IS DISTINCT FROM OLD.monto_autorizado
     OR NEW.monto_capturado IS DISTINCT FROM OLD.monto_capturado
     OR NEW.comision_porcentaje IS DISTINCT FROM OLD.comision_porcentaje
     OR NEW.comision_estimada IS DISTINCT FROM OLD.comision_estimada
     OR NEW.comision_final IS DISTINCT FROM OLD.comision_final
     OR NEW.ajuste_pendiente IS DISTINCT FROM OLD.ajuste_pendiente
     OR NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id
     OR NEW.stripe_checkout_session_id IS DISTINCT FROM OLD.stripe_checkout_session_id
     OR NEW.autorizado_en IS DISTINCT FROM OLD.autorizado_en
     OR NEW.capturado_en IS DISTINCT FROM OLD.capturado_en
     OR NEW.captura_intentos IS DISTINCT FROM OLD.captura_intentos
     OR NEW.cliente_id IS DISTINCT FROM OLD.cliente_id
     OR NEW.business_id IS DISTINCT FROM OLD.business_id
  THEN
    RAISE EXCEPTION 'Los montos y datos de pago del pedido solo los cambia el sistema';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER store_orders_protect_money
BEFORE UPDATE ON public.store_orders
FOR EACH ROW EXECUTE FUNCTION public.store_orders_protect_money();

CREATE OR REPLACE FUNCTION public.store_order_items_touch()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

CREATE TRIGGER store_order_items_touch
BEFORE UPDATE ON public.store_order_items
FOR EACH ROW EXECUTE FUNCTION public.store_order_items_touch();

-- ============ Estado válido del pedido ============
CREATE OR REPLACE FUNCTION public.validate_store_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.estado NOT IN ('pendiente_pago','confirmado','preparando','listo','entregado','cancelado','cobro_fallido') THEN
    RAISE EXCEPTION 'estado invalido';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER store_orders_validate
BEFORE INSERT OR UPDATE ON public.store_orders
FOR EACH ROW EXECUTE FUNCTION public.validate_store_order();