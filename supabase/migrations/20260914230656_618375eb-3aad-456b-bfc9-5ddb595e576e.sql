REVOKE ALL ON FUNCTION public.minutes_per_stop() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalculate_route_etas(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_route_stop_recalc_etas() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_route_stops_set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_my_stop_eta(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_stop_eta(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.minutes_per_stop() TO service_role;
GRANT EXECUTE ON FUNCTION public.recalculate_route_etas(uuid) TO service_role;