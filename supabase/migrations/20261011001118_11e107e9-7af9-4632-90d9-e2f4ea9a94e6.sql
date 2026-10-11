REVOKE ALL ON FUNCTION public.my_available_delivery_blocks() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.my_available_delivery_blocks() TO service_role;
REVOKE ALL ON FUNCTION public.reserve_delivery_block(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_delivery_block(uuid) TO service_role;