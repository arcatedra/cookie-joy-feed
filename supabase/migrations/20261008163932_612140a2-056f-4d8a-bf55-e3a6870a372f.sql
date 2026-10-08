ALTER FUNCTION public.credit_balance_for_environment(text) SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.request_wallet_withdrawal(numeric,text) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.request_wallet_withdrawal_for_user(p_user uuid,p_amount numeric,p_environment text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_balance numeric; v_id uuid;
BEGIN
 IF p_user IS NULL OR p_environment IS NULL OR p_environment NOT IN ('sandbox','live') OR p_amount IS NULL OR p_amount<=0 OR p_amount<>round(p_amount,2) THEN RAISE EXCEPTION 'Importe inválido'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text||':'||p_environment,0));
 SELECT COALESCE(SUM(amount_usd),0) INTO v_balance FROM wallet_credits WHERE user_id=p_user AND stripe_environment=p_environment;
 IF p_amount>v_balance THEN RAISE EXCEPTION 'Saldo insuficiente'; END IF;
 INSERT INTO withdrawal_requests(profile_id,amount_usd,status,source,stripe_environment) VALUES(p_user,p_amount,'pending','referral',p_environment) RETURNING id INTO v_id;
 INSERT INTO wallet_credits(user_id,amount_usd,reason,stripe_environment,operation_key) VALUES(p_user,-p_amount,'retiro_pendiente',p_environment,'withdraw:'||v_id);
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.request_wallet_withdrawal_for_user(uuid,numeric,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.request_wallet_withdrawal_for_user(uuid,numeric,text) TO service_role;