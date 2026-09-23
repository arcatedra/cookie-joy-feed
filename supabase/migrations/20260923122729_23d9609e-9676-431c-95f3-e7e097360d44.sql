DROP POLICY IF EXISTS "delivery_settings_read" ON public.delivery_settings;
CREATE POLICY "delivery_settings_read_admin" ON public.delivery_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));