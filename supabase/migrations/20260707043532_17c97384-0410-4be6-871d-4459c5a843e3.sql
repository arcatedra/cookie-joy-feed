
REVOKE EXECUTE ON FUNCTION public.restore_row(text, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.request_driver_payout(numeric, numeric) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.complete_driver_payout(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.reverse_failed_payout(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.run_test_draw_tick() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.list_soft_deleted(integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.cron_status() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.reorder_route_stop(uuid, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.accept_route(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.start_route_transit(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.complete_route_stop(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.scan_route_package(uuid, text) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.restore_row(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_driver_payout(numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_driver_payout(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_failed_payout(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_test_draw_tick() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_soft_deleted(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cron_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_route_stop(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_route(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_route_transit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_route_stop(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.scan_route_package(uuid, text) TO authenticated;
