REVOKE EXECUTE ON FUNCTION public.get_my_credit_balance() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_my_credit_balance() TO authenticated;