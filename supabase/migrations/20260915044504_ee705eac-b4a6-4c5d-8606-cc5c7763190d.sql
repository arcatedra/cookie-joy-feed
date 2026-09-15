
CREATE POLICY "store_media_owner_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'store-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "store_media_owner_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'store-media' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'store-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "store_media_owner_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'store-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "store_media_read"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'store-media');
