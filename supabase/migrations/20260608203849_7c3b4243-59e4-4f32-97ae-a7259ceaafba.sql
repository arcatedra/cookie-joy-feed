
CREATE POLICY "Public read reels bucket" ON storage.objects FOR SELECT USING (bucket_id = 'reels');
CREATE POLICY "Auth upload reels" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'reels' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Auth update own reels" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'reels' AND owner = auth.uid());
CREATE POLICY "Auth delete own reels" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'reels' AND owner = auth.uid());
