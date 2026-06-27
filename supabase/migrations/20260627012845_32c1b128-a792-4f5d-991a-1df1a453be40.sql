
-- Tighten reels CMS: only admins can create, edit, or delete reels
DROP POLICY IF EXISTS reels_auth_insert ON public.reels;
CREATE POLICY reels_admin_insert ON public.reels
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "reels_author_or_admin_update" ON public.reels;
CREATE POLICY reels_admin_update ON public.reels
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS reels_author_or_admin_delete ON public.reels;
CREATE POLICY reels_admin_delete ON public.reels
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Enable realtime so new/deleted reels propagate live to all visitors
ALTER TABLE public.reels REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.reels;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
