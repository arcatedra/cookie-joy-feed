CREATE TABLE public.pedido_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  from_estado text,
  to_estado text NOT NULL,
  actor_id uuid,
  nota text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pedido_status_events TO authenticated;
GRANT ALL ON public.pedido_status_events TO service_role;
ALTER TABLE public.pedido_status_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read cookie order history" ON public.pedido_status_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX pedido_status_events_pedido_idx ON public.pedido_status_events(pedido_id, created_at);