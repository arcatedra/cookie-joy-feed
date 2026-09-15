REVOKE EXECUTE ON FUNCTION public.store_orders_protect_money() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.store_order_items_touch() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.validate_store_order() FROM anon, authenticated, public;