
CREATE TABLE public.support_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id uuid,
  reason text NOT NULL CHECK (reason IN ('falta_articulo','danado','no_llego','otro')),
  product_name text,
  status text NOT NULL DEFAULT 'pending',
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.support_issues TO authenticated;
GRANT ALL ON public.support_issues TO service_role;
ALTER TABLE public.support_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own issues select" ON public.support_issues FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own issues insert" ON public.support_issues FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "own issues update" ON public.support_issues FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL UNIQUE REFERENCES public.support_issues(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.support_conversations TO authenticated;
GRANT ALL ON public.support_conversations TO service_role;
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conv select" ON public.support_conversations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.support_issues i WHERE i.id = issue_id AND (i.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "conv insert" ON public.support_conversations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.support_issues i WHERE i.id = issue_id AND i.user_id = auth.uid()));
CREATE POLICY "conv update" ON public.support_conversations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.support_issues i WHERE i.id = issue_id AND (i.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.support_issues i WHERE i.id = issue_id AND (i.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('customer','support','system')),
  body text NOT NULL,
  action text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_messages_conv_idx ON public.support_messages(conversation_id, created_at);
GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg select" ON public.support_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.support_conversations c JOIN public.support_issues i ON i.id = c.issue_id
                 WHERE c.id = conversation_id AND (i.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "msg insert customer" ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (
    (sender = 'customer' AND EXISTS (SELECT 1 FROM public.support_conversations c JOIN public.support_issues i ON i.id = c.issue_id
       WHERE c.id = conversation_id AND i.user_id = auth.uid()))
    OR (public.has_role(auth.uid(),'admin'))
  );

CREATE OR REPLACE FUNCTION public.set_updated_at_support()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER support_issues_updated_at BEFORE UPDATE ON public.support_issues
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_support();
CREATE TRIGGER support_conversations_updated_at BEFORE UPDATE ON public.support_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_support();

ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
