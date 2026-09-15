ALTER TABLE public.pedido_items
  ADD COLUMN IF NOT EXISTS substitution_mode text NOT NULL DEFAULT 'best_match',
  ADD COLUMN IF NOT EXISTS substitute_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS substituted_with_id uuid REFERENCES public.productos(id),
  ADD COLUMN IF NOT EXISTS customer_response text,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS notified_at timestamptz;

CREATE OR REPLACE FUNCTION public.validate_pedido_item_substitution()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.substitution_mode NOT IN ('best_match','specific','refund') THEN
    RAISE EXCEPTION 'substitution_mode invalido';
  END IF;
  IF NEW.status NOT IN ('pendiente','encontrado','sin_stock','sustituido') THEN
    RAISE EXCEPTION 'status invalido';
  END IF;
  IF NEW.customer_response IS NOT NULL
     AND NEW.customer_response NOT IN ('accept','refund','choose') THEN
    RAISE EXCEPTION 'customer_response invalido';
  END IF;
  IF COALESCE(array_length(NEW.substitute_ids, 1), 0) > 3 THEN
    RAISE EXCEPTION 'maximo 3 alternativas';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pedido_items_validate_substitution ON public.pedido_items;
CREATE TRIGGER pedido_items_validate_substitution
  BEFORE INSERT OR UPDATE ON public.pedido_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_pedido_item_substitution();

CREATE POLICY "Clientes responden sustituciones de sus pedidos"
  ON public.pedido_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pedidos p
                 WHERE p.id = pedido_items.pedido_id AND p.cliente_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pedidos p
                 WHERE p.id = pedido_items.pedido_id AND p.cliente_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.respond_substitution(p_item_id uuid, p_response text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_response NOT IN ('accept','refund') THEN
    RAISE EXCEPTION 'Respuesta invalida';
  END IF;

  UPDATE public.pedido_items pi
     SET customer_response = p_response,
         responded_at = now(),
         substitution_mode = CASE WHEN p_response = 'refund' THEN 'refund' ELSE 'best_match' END,
         status = CASE WHEN p_response = 'refund' THEN 'sin_stock' ELSE 'sustituido' END
   WHERE pi.id = p_item_id
     AND pi.status = 'sin_stock'
     AND pi.customer_response IS NULL
     AND EXISTS (SELECT 1 FROM public.pedidos p
                  WHERE p.id = pi.pedido_id AND p.cliente_id = auth.uid());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Articulo no disponible para responder';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.respond_substitution(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_substitution(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.apply_substitution_timeouts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  UPDATE public.pedido_items pi
     SET customer_response = 'timeout_default',
         responded_at = now(),
         status = CASE WHEN pi.substitution_mode = 'refund' THEN 'sin_stock' ELSE 'sustituido' END
   WHERE pi.status = 'sin_stock'
     AND pi.customer_response IS NULL
     AND pi.notified_at IS NOT NULL
     AND pi.notified_at <= now() - interval '10 minutes';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_substitution_timeouts() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_pending_substitutions(p_order_id uuid)
RETURNS TABLE(item_id uuid, nombre_producto text, cantidad integer, notified_at timestamptz, substitution_mode text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pi.id, pi.nombre_producto, pi.cantidad, pi.notified_at, pi.substitution_mode
    FROM public.pedido_items pi
    JOIN public.pedidos p ON p.id = pi.pedido_id
   WHERE pi.pedido_id = p_order_id
     AND p.cliente_id = auth.uid()
     AND pi.status = 'sin_stock'
     AND pi.customer_response IS NULL
   ORDER BY pi.notified_at NULLS LAST
   LIMIT 20;
$$;

REVOKE ALL ON FUNCTION public.get_my_pending_substitutions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_pending_substitutions(uuid) TO authenticated;