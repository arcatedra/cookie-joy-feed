REVOKE SELECT (donation_tier) ON public.profiles FROM anon, authenticated;
REVOKE INSERT (donation_tier), UPDATE (donation_tier) ON public.profiles FROM anon, authenticated;
GRANT ALL ON public.profiles TO service_role;