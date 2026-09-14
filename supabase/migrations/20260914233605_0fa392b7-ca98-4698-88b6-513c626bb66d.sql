ALTER TABLE public.route_stops
  ADD COLUMN IF NOT EXISTS delivery_note text;

CREATE OR REPLACE FUNCTION public.get_my_delivery_proof(p_order_id uuid)
RETURNS TABLE(
  delivered_at timestamptz,
  delivery_photo_url text,
  delivery_note text,
  recipient_name text,
  status text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT rs.delivered_at, rs.delivery_photo_url, rs.delivery_note,
         rs.recipient_name, rs.status::text
    FROM public.route_stops rs
    JOIN public.pedidos p ON p.id = rs.order_id
   WHERE rs.order_id = p_order_id
     AND p.cliente_id = auth.uid()
     AND rs.status = 'entregado'
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_my_delivery_proof(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_delivery_proof(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_delivery_proof(uuid) TO authenticated;