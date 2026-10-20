BEGIN;
ALTER POLICY reel_likes_select_authenticated ON public.reel_likes TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.media_reference_matches(reference text, bucket text, object_name text)
RETURNS boolean LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path = public
AS $$ SELECT COALESCE(reference = object_name OR right(split_part(reference,'?',1),length(bucket || '/' || object_name)+1) = '/' || bucket || '/' || object_name, false) $$;
REVOKE ALL ON FUNCTION public.media_reference_matches(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.media_reference_matches(text,text,text) TO anon,authenticated,service_role;

ALTER POLICY "Public read reels-media" ON storage.objects TO anon,authenticated
USING (bucket_id='reels-media' AND EXISTS (
 SELECT 1 FROM public.reels r WHERE public.media_reference_matches(r.video_url,bucket_id,name)
 OR public.media_reference_matches(r.thumb_url,bucket_id,name)
 OR public.media_reference_matches(r.product_image,bucket_id,name)
));
ALTER POLICY store_media_read ON storage.objects TO anon,authenticated
USING (bucket_id='store-media' AND (
 EXISTS (SELECT 1 FROM public.approved_businesses_public b WHERE public.media_reference_matches(b.logo_url,bucket_id,name) OR public.media_reference_matches(b.banner_url,bucket_id,name))
 OR EXISTS (SELECT 1 FROM public.store_products p WHERE public.media_reference_matches(p.imagen_url,bucket_id,name) OR public.media_reference_matches(p.foto_original_url,bucket_id,name))
 OR EXISTS (SELECT 1 FROM public.business_products p WHERE public.media_reference_matches(p.image_url,bucket_id,name))
));
CREATE POLICY commercial_media_owner_admin_read ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('store-media','reels-media') AND ((storage.foldername(name))[1]=auth.uid()::text OR public.has_role(auth.uid(),'admin'::public.app_role)));
COMMIT;