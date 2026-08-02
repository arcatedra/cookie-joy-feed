-- Lock down SECURITY DEFINER / internal functions from anon & authenticated

-- 1) Fully internal functions: no API role should call them
REVOKE ALL ON FUNCTION public.crear_pedido_con_items(uuid, jsonb, numeric, numeric, numeric, numeric, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.upsert_suscripcion_stripe(uuid, text, text, numeric, text, text, timestamptz, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_referral_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.promote_available_commissions() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_profile() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_cliente() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.actualizar_timestamp() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at_withdrawal() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.crear_pedido_con_items(uuid, jsonb, numeric, numeric, numeric, numeric, text, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.upsert_suscripcion_stripe(uuid, text, text, numeric, text, text, timestamptz, timestamptz, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_referral_code() TO service_role;
GRANT EXECUTE ON FUNCTION public.promote_available_commissions() TO service_role;

-- 2) User-scoped functions: authenticated only (they already check auth.uid() internally)
REVOKE ALL ON FUNCTION public.get_my_referral_profile() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_referrals() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.request_affiliate_withdrawal() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_withdrawals() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_process_withdrawal(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_public_profiles(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reel_like_counts(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reel_comment_counts(uuid[]) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_my_referral_profile() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_referrals() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_affiliate_withdrawal() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_withdrawals() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_process_withdrawal(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reel_like_counts(uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reel_comment_counts(uuid[]) TO authenticated, service_role;