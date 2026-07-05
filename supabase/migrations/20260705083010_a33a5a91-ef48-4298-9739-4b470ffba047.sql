
ALTER TABLE public.delivery_bookings
  ADD COLUMN IF NOT EXISTS proof_photo_path text,
  ADD COLUMN IF NOT EXISTS proof_description text,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Storage policies for delivery-proofs bucket
-- Path convention: <user_id>/<booking_id>.jpg  (first folder segment = owner user_id)

CREATE POLICY "delivery_proofs_admin_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'delivery-proofs' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "delivery_proofs_admin_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'delivery-proofs' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "delivery_proofs_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'delivery-proofs' AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (bucket_id = 'delivery-proofs' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "delivery_proofs_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'delivery-proofs' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "delivery_proofs_owner_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'delivery-proofs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
