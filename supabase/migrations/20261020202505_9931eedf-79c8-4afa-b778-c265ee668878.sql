ALTER TABLE public.store_order_items
  ADD COLUMN IF NOT EXISTS especial boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS foto_especial text,
  ADD COLUMN IF NOT EXISTS marca_especial text,
  ADD COLUMN IF NOT EXISTS tamano_especial text;

CREATE POLICY "special_order_photo_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'store-media' AND (storage.foldername(name))[1] = 'special' AND (storage.foldername(name))[2] = auth.uid()::text);
CREATE POLICY "special_order_photo_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'store-media' AND (storage.foldername(name))[1] = 'special' AND ((storage.foldername(name))[2] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));