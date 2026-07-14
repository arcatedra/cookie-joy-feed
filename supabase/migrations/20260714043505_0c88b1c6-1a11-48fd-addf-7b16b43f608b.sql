DROP POLICY IF EXISTS "anyone_can_insert_ui_events" ON public.ui_analytics_events;

CREATE POLICY "anon_can_insert_ui_events"
  ON public.ui_analytics_events
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "authenticated_can_insert_own_ui_events"
  ON public.ui_analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
