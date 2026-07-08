
-- Remove overly-permissive public SELECT on the base table
DROP POLICY IF EXISTS "Public views approved businesses" ON public.businesses;

-- Public-safe view exposing only non-sensitive columns of approved businesses
CREATE OR REPLACE VIEW public.approved_businesses_public
WITH (security_invoker = true) AS
SELECT
  id,
  business_name,
  business_type,
  city,
  logo_url,
  status,
  created_at
FROM public.businesses
WHERE status = 'aprobado';

GRANT SELECT ON public.approved_businesses_public TO anon, authenticated;
