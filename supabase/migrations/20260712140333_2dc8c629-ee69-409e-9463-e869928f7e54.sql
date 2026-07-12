
CREATE TABLE public.ui_analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ui_analytics_events_event_name_idx ON public.ui_analytics_events (event_name, occurred_at DESC);
CREATE INDEX ui_analytics_events_occurred_at_idx ON public.ui_analytics_events (occurred_at DESC);

GRANT INSERT ON public.ui_analytics_events TO anon, authenticated;
GRANT SELECT ON public.ui_analytics_events TO authenticated;
GRANT ALL ON public.ui_analytics_events TO service_role;

ALTER TABLE public.ui_analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_insert_ui_events"
  ON public.ui_analytics_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "admins_can_read_ui_events"
  ON public.ui_analytics_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
