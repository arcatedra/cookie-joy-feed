DROP POLICY IF EXISTS product_ratings_public_read ON public.product_ratings;

CREATE POLICY product_ratings_self_read ON public.product_ratings
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_product_rating_summary(p_product_id text)
RETURNS TABLE(avg numeric, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(AVG(stars)::numeric, 0) AS avg, COUNT(*)::bigint AS count
    FROM public.product_ratings
   WHERE product_id = p_product_id;
$$;

REVOKE ALL ON FUNCTION public.get_product_rating_summary(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_product_rating_summary(text) TO anon, authenticated;