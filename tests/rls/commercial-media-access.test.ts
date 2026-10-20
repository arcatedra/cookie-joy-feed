import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, it, expect } from 'vitest';

const db = new PGlite();
const user = '00000000-0000-4000-8000-000000000001';
beforeAll(async () => {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    CREATE TYPE public.app_role AS ENUM ('admin','user');
    CREATE FUNCTION public.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
    CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql AS $$ SELECT string_to_array($1,'/') $$;
    GRANT USAGE ON SCHEMA auth,storage TO anon,authenticated;
    CREATE TABLE public.reels(video_url text,thumb_url text,product_image text);
    CREATE TABLE public.businesses(logo_url text,banner_url text);
    CREATE VIEW public.approved_businesses_public WITH (security_invoker=true) AS SELECT * FROM public.businesses;
    CREATE TABLE public.store_products(imagen_url text,foto_original_url text);
    CREATE TABLE public.business_products(image_url text);
    CREATE TABLE public.reel_likes(user_id uuid,reel_id uuid);
    CREATE TABLE storage.objects(bucket_id text,name text);
    GRANT SELECT ON public.reels,public.businesses,public.approved_businesses_public,public.store_products,public.business_products,public.reel_likes,storage.objects TO anon,authenticated;
    ALTER TABLE public.reel_likes ENABLE ROW LEVEL SECURITY;
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    CREATE POLICY reel_likes_select_authenticated ON public.reel_likes FOR SELECT TO authenticated USING(true);
    CREATE POLICY "Public read reels-media" ON storage.objects FOR SELECT TO anon,authenticated USING(bucket_id='reels-media');
    CREATE POLICY store_media_read ON storage.objects FOR SELECT TO anon,authenticated USING(bucket_id='store-media');
    INSERT INTO public.reels VALUES('https://example.test/storage/v1/object/public/reels-media/public.mp4',null,null);
    INSERT INTO public.store_products VALUES('house/public.jpg','house/original.jpg');
    INSERT INTO public.reel_likes VALUES('${user}','${user}'),('00000000-0000-4000-8000-000000000002','${user}');
    INSERT INTO storage.objects VALUES('reels-media','public.mp4'),('reels-media','private.mp4'),('store-media','house/public.jpg'),('store-media','house/original.jpg'),('store-media','house/private.jpg'),('store-media','${user}/draft.jpg');
  `);
  await db.exec(readFileSync(new URL('../../supabase/migrations/20261020054247_be20ece0-52ef-4b14-9211-6f9ce29e2099.sql',import.meta.url),'utf8'));
});
afterAll(async () => { await db.close(); });
async function asRole(role: string, sql: string) {
  await db.exec(`SET ROLE ${role}; SELECT set_config('test.uid','${role==='authenticated'?user:''}',false);`);
  try { return (await db.query(sql)).rows; } finally { await db.exec('RESET ROLE'); }
}
it('visitors can read referenced video but not unused video',async () => {
  expect(await asRole('anon',`SELECT name FROM storage.objects WHERE bucket_id='reels-media' ORDER BY name`)).toEqual([{name:'public.mp4'}]);
});
it('visitors keep current and original catalog photos without unused files',async () => {
  expect(await asRole('anon',`SELECT name FROM storage.objects WHERE bucket_id='store-media' ORDER BY name`)).toEqual([{name:'house/original.jpg'},{name:'house/public.jpg'}]);
});
it('an owner can still read their own unpublished upload',async () => {
  expect(await asRole('authenticated',`SELECT name FROM storage.objects WHERE name='${user}/draft.jpg'`)).toEqual([{name:`${user}/draft.jpg`}]);
});
it('signed-in users cannot list other peoples likes',async () => {
  expect(await asRole('authenticated','SELECT user_id FROM public.reel_likes')).toEqual([{user_id:user}]);
});