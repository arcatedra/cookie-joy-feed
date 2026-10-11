CREATE TABLE public.post_delivery_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('cookie','store')),
  order_id uuid NOT NULL,
  cliente_id uuid NOT NULL,
  driver_id uuid NOT NULL,
  request_id uuid NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount >= 1 AND amount <= 100),
  stripe_environment text NOT NULL CHECK (stripe_environment IN ('sandbox','live')),
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','requiere_pago','pagado','fallido')),
  payment_intent_id text,
  checkout_session_id text,
  charge_id text,
  last_error text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, request_id)
);
CREATE UNIQUE INDEX post_delivery_tips_pi_unique ON public.post_delivery_tips(payment_intent_id) WHERE payment_intent_id IS NOT NULL;
CREATE INDEX post_delivery_tips_order ON public.post_delivery_tips(kind, order_id);
CREATE INDEX post_delivery_tips_driver ON public.post_delivery_tips(driver_id, created_at);

GRANT SELECT ON public.post_delivery_tips TO authenticated;
GRANT ALL ON public.post_delivery_tips TO service_role;
ALTER TABLE public.post_delivery_tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clientes ven sus propinas extra" ON public.post_delivery_tips FOR SELECT TO authenticated USING (cliente_id = auth.uid());
CREATE POLICY "Admin ve propinas extra" ON public.post_delivery_tips FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.touch_post_delivery_tips() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
CREATE TRIGGER post_delivery_tips_touch BEFORE UPDATE ON public.post_delivery_tips FOR EACH ROW EXECUTE FUNCTION public.touch_post_delivery_tips();

ALTER TABLE public.driver_payouts ADD COLUMN post_tip_id uuid REFERENCES public.post_delivery_tips(id);
ALTER TABLE public.driver_payouts ADD CONSTRAINT driver_payouts_post_tip_unique UNIQUE (post_tip_id);