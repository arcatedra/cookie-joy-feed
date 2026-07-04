
-- =============================================
-- Support / Order-item availability notifications
-- =============================================

-- 1) order_item_issues: one row per unavailable item flagged by admin
CREATE TABLE public.order_item_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID,  -- copied from orders.user_id (nullable for guest orders)
  item_index INT NOT NULL,
  product_name TEXT NOT NULL,
  original_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  original_qty INT NOT NULL DEFAULT 1,
  replacement_product_id TEXT,
  replacement_name TEXT,
  replacement_price NUMERIC(12,2),
  replacement_image TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','replaced','cancelled','expired')),
  resolved_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.order_item_issues TO authenticated;
GRANT ALL ON public.order_item_issues TO service_role;
ALTER TABLE public.order_item_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view their issues" ON public.order_item_issues
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Owners update their issues (resolve)" ON public.order_item_issues
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins insert issues" ON public.order_item_issues
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE INDEX idx_order_item_issues_user ON public.order_item_issues(user_id, status);
CREATE INDEX idx_order_item_issues_order ON public.order_item_issues(order_id);


-- 2) support_conversations
CREATE TABLE public.support_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL UNIQUE REFERENCES public.order_item_issues(id) ON DELETE CASCADE,
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.support_conversations TO authenticated;
GRANT ALL ON public.support_conversations TO service_role;
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view own conv" ON public.support_conversations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

CREATE INDEX idx_support_conv_user ON public.support_conversations(user_id);


-- 3) support_messages
CREATE TABLE public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('support','customer','system')),
  body TEXT NOT NULL,
  action TEXT CHECK (action IN ('accept_replacement','cancel_item')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View messages of own conv" ON public.support_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_conversations c
       WHERE c.id = support_messages.conversation_id
         AND (c.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role))
    )
  );
CREATE POLICY "Insert own messages" ON public.support_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender = 'customer' AND EXISTS (
      SELECT 1 FROM public.support_conversations c
       WHERE c.id = support_messages.conversation_id
         AND c.user_id = auth.uid()
    )
  );

CREATE INDEX idx_support_msgs_conv ON public.support_messages(conversation_id, created_at);


-- 4) customer_notifications (bell inbox)
CREATE TABLE public.customer_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  issue_id UUID REFERENCES public.order_item_issues(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.customer_notifications TO authenticated;
GRANT ALL ON public.customer_notifications TO service_role;
ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view their notifs" ON public.customer_notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Owners mark read" ON public.customer_notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_cust_notifs_user_unread ON public.customer_notifications(user_id, read_at);


-- 5) Trigger: on order_item_issues insert, backfill user_id from order and seed conversation + message + notification
CREATE OR REPLACE FUNCTION public.seed_support_thread_for_issue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_conv UUID;
  v_initial TEXT;
  v_short TEXT;
BEGIN
  SELECT user_id INTO v_user FROM public.orders WHERE id = NEW.order_id;

  IF NEW.user_id IS NULL THEN
    NEW.user_id := v_user;
  END IF;

  INSERT INTO public.support_conversations (issue_id, user_id)
  VALUES (NEW.id, NEW.user_id)
  RETURNING id INTO v_conv;

  v_short := upper(substr(NEW.order_id::text, 1, 8));
  v_initial := 'Hola 👋 Soy del equipo de Soporte Hazorex. Lamentamos informarte que uno de los productos de tu pedido #' 
    || v_short || ' no está disponible actualmente: ' || NEW.product_name || '.';

  INSERT INTO public.support_messages (conversation_id, sender, body)
  VALUES (v_conv, 'support', v_initial);

  IF NEW.replacement_name IS NOT NULL THEN
    INSERT INTO public.support_messages (conversation_id, sender, body)
    VALUES (v_conv, 'support',
      'Te podemos ofrecer como reemplazo: ' || NEW.replacement_name ||
      COALESCE(' — $' || NEW.replacement_price::text, '') ||
      '. ¿Aceptas el reemplazo o prefieres cancelar este producto?');
  ELSE
    INSERT INTO public.support_messages (conversation_id, sender, body)
    VALUES (v_conv, 'support',
      '¿Prefieres que te enviemos un producto de reemplazo similar, o cancelamos este producto de tu pedido?');
  END IF;

  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO public.customer_notifications (user_id, type, issue_id, title, body)
    VALUES (
      NEW.user_id,
      'item_unavailable',
      NEW.id,
      'Producto no disponible en tu pedido',
      NEW.product_name || ' — pedido #' || v_short
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seed_support_thread
BEFORE INSERT ON public.order_item_issues
FOR EACH ROW EXECUTE FUNCTION public.seed_support_thread_for_issue();

-- updated_at bumps
CREATE TRIGGER trg_order_item_issues_updated
BEFORE UPDATE ON public.order_item_issues
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_support_conv_updated
BEFORE UPDATE ON public.support_conversations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Bump conversation last_message_at when new messages arrive
CREATE OR REPLACE FUNCTION public.support_bump_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.support_conversations
     SET last_message_at = NEW.created_at, updated_at = now()
   WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_support_bump_last
AFTER INSERT ON public.support_messages
FOR EACH ROW EXECUTE FUNCTION public.support_bump_last_message();

-- 6) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_item_issues;
