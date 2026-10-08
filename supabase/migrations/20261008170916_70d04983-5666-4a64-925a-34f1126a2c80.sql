ALTER TABLE public.withdrawal_requests ADD COLUMN payout_method text, ADD COLUMN payout_identifier text;
CREATE FUNCTION public.valid_manual_payout_destination(p_method text,p_identifier text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT COALESCE(p_method IN ('zelle','cash_app') AND length(p_identifier) BETWEEN 3 AND 254 AND (p_identifier ~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$' OR p_identifier ~ '^\+1[2-9][0-9]{2}[2-9][0-9]{6}$' OR (p_method='cash_app' AND p_identifier ~ '^\$[A-Za-z][A-Za-z0-9]{0,19}$')),false) $$;
REVOKE ALL ON FUNCTION public.valid_manual_payout_destination(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.valid_manual_payout_destination(text,text) TO authenticated,service_role;
CREATE FUNCTION public.validate_manual_payout_destination() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF TG_OP='UPDATE' AND (NEW.payout_method IS DISTINCT FROM OLD.payout_method OR NEW.payout_identifier IS DISTINCT FROM OLD.payout_identifier) THEN RAISE EXCEPTION 'El destino de una solicitud no puede cambiarse'; END IF;
 IF NEW.payout_method IS NULL AND NEW.payout_identifier IS NULL THEN RETURN NEW; END IF;
 IF NEW.source <> 'referral' OR NOT public.valid_manual_payout_destination(NEW.payout_method,NEW.payout_identifier) THEN RAISE EXCEPTION 'Destino de retiro inválido: usa correo, teléfono de EE. UU. o cashtag de Cash App'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validate_manual_payout_destination() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_manual_payout_destination BEFORE INSERT OR UPDATE OF payout_method,payout_identifier ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.validate_manual_payout_destination();
CREATE FUNCTION public.request_wallet_withdrawal_to_destination(p_user uuid,p_amount numeric,p_environment text,p_method text,p_identifier text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE v_balance numeric; v_id uuid; BEGIN
 IF NOT public.valid_manual_payout_destination(p_method,p_identifier) THEN RAISE EXCEPTION 'Destino de retiro inválido'; END IF;
 IF p_user IS NULL OR p_environment IS NULL OR p_environment NOT IN ('sandbox','live') OR p_amount IS NULL OR p_amount::text IN ('NaN','Infinity','-Infinity') OR p_amount<=0 OR p_amount>100000 OR p_amount<>round(p_amount,2) THEN RAISE EXCEPTION 'Importe inválido'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text||':'||p_environment,0));
 SELECT COALESCE(SUM(amount_usd),0) INTO v_balance FROM public.wallet_credits WHERE user_id=p_user AND stripe_environment=p_environment;
 IF p_amount>v_balance THEN RAISE EXCEPTION 'Saldo insuficiente'; END IF;
 INSERT INTO public.withdrawal_requests(profile_id,amount_usd,status,source,stripe_environment,payout_method,payout_identifier) VALUES(p_user,p_amount,'pending','referral',p_environment,p_method,p_identifier) RETURNING id INTO v_id;
 INSERT INTO public.wallet_credits(user_id,amount_usd,reason,stripe_environment,operation_key) VALUES(p_user,-p_amount,'retiro_pendiente',p_environment,'withdraw:'||v_id);
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.request_wallet_withdrawal_to_destination(uuid,numeric,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.request_wallet_withdrawal_to_destination(uuid,numeric,text,text,text) TO service_role;