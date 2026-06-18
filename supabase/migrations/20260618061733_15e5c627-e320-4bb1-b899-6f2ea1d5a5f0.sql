
-- 1) Replace the blanket public SELECT policy with one scoped to anon + authenticated only.
DROP POLICY IF EXISTS profiles_basic_read ON public.profiles;

CREATE POLICY profiles_public_basic_read
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);

-- 2) Lock down column-level grants so donation_tier is never readable via the Data API,
--    even if the policy above is later widened by mistake.
REVOKE SELECT ON public.profiles FROM anon, authenticated, PUBLIC;

GRANT SELECT (id, display_name) ON public.profiles TO anon, authenticated;

-- 3) Preserve existing write paths for owners and admin/server code.
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
