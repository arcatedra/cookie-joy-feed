CREATE OR REPLACE FUNCTION public.request_affiliate_withdrawal()
RETURNS TABLE(withdrawal_id uuid, amount_usd numeric, commissions_count integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_uid uuid:=auth.uid(); v_total numeric:=0; v_count int:=0; v_withdrawal uuid;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_uid::text,0));
 PERFORM public.promote_available_commissions();
 PERFORM ac.id FROM public.affiliate_commissions ac WHERE ac.affiliate_profile_id=v_uid AND ac.status='available' ORDER BY ac.id FOR UPDATE;
 SELECT COALESCE(SUM(ac.amount_usd),0),COUNT(*)::int INTO v_total,v_count FROM public.affiliate_commissions ac WHERE ac.affiliate_profile_id=v_uid AND ac.status='available';
 IF v_count=0 OR v_total<=0 THEN RAISE EXCEPTION 'No available commissions'; END IF;
 INSERT INTO public.withdrawal_requests(profile_id,amount_usd,status) VALUES(v_uid,v_total,'pending') RETURNING id INTO v_withdrawal;
 UPDATE public.affiliate_commissions SET status='requested' WHERE affiliate_profile_id=v_uid AND status='available';
 withdrawal_id:=v_withdrawal; amount_usd:=v_total; commissions_count:=v_count; RETURN NEXT;
END $$;
REVOKE EXECUTE ON FUNCTION public.request_affiliate_withdrawal() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.request_affiliate_withdrawal() TO authenticated,service_role;