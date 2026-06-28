-- Allow anyone (anon + authenticated) to read files in the 'reels' bucket
-- The bucket stays private but reel videos become publicly playable via the
-- standard /storage/v1/object/public/reels/... URLs.
DROP POLICY IF EXISTS "Public read reels" ON storage.objects;
CREATE POLICY "Public read reels"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'reels');