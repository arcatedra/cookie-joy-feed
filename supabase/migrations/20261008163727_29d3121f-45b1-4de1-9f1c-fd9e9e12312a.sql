ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS propina numeric NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS credito_aplicado numeric NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS stripe_environment text;
ALTER TABLE public.wallet_credits ADD COLUMN IF NOT EXISTS stripe_environment text, ADD COLUMN IF NOT EXISTS order_kind text, ADD COLUMN IF NOT EXISTS operation_key text;
CREATE UNIQUE INDEX wallet_operation_key_unique ON public.wallet_credits(operation_key) WHERE operation_key IS NOT NULL;
ALTER TABLE public.referral_rewards ADD COLUMN IF NOT EXISTS stripe_environment text, ADD COLUMN IF NOT EXISTS order_kind text;
ALTER TABLE public.referral_rewards DROP CONSTRAINT referral_rewards_referee_id_key;
CREATE UNIQUE INDEX referral_reward_environment_unique ON public.referral_rewards(referee_id,COALESCE(stripe_environment,'live'));
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'affiliate', ADD COLUMN IF NOT EXISTS stripe_environment text;
ALTER TABLE public.driver_payouts ALTER COLUMN order_id DROP NOT NULL;
ALTER TABLE public.driver_payouts ADD COLUMN IF NOT EXISTS cookie_order_id uuid REFERENCES public.pedidos(id);
CREATE UNIQUE INDEX driver_cookie_order_unique ON public.driver_payouts(cookie_order_id);
CREATE TRIGGER pedidos_validate_environment BEFORE INSERT OR UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.validate_stripe_environment();
CREATE FUNCTION public.protect_referrer_link() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF auth.role()='authenticated' AND NEW.referred_by IS DISTINCT FROM OLD.referred_by THEN RAISE EXCEPTION 'El vínculo de invitación no puede cambiarse'; END IF; RETURN NEW; END $$;
CREATE TRIGGER profiles_protect_referrer BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_referrer_link();
REVOKE INSERT,UPDATE,DELETE ON public.withdrawal_requests FROM authenticated;
DROP POLICY IF EXISTS withdrawal_requests_insert_own ON public.withdrawal_requests;
DROP POLICY IF EXISTS withdrawal_requests_admin_all ON public.withdrawal_requests;
CREATE POLICY withdrawal_requests_admin_read ON public.withdrawal_requests FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.credit_balance_for_environment(p_environment text) RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT COALESCE(SUM(amount_usd),0) FROM public.wallet_credits WHERE user_id=auth.uid() AND stripe_environment=p_environment AND p_environment IN ('sandbox','live'); $$;
REVOKE ALL ON FUNCTION public.credit_balance_for_environment(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.credit_balance_for_environment(text) TO authenticated,service_role;
CREATE FUNCTION public.reserve_order_credit(p_kind text,p_order uuid,p_limit numeric,p_environment text) RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o record; v_uid uuid; v_amount numeric; v_existing numeric;
BEGIN
 IF p_environment NOT IN ('sandbox','live') OR p_limit<0 THEN RAISE EXCEPTION 'Datos inválidos'; END IF;
 IF p_kind='store' THEN SELECT cliente_id,stripe_environment,estado INTO o FROM store_orders WHERE id=p_order; ELSIF p_kind='cookie' THEN SELECT cliente_id,stripe_environment,estado INTO o FROM pedidos WHERE id=p_order; ELSE RAISE EXCEPTION 'Origen inválido'; END IF;
 IF o.cliente_id IS NULL OR o.stripe_environment IS DISTINCT FROM p_environment OR o.estado NOT IN ('pendiente_pago','pendiente') THEN RAISE EXCEPTION 'Pedido no disponible'; END IF;
 v_uid:=o.cliente_id; PERFORM pg_advisory_xact_lock(hashtextextended(v_uid::text||':'||p_environment,0));
 SELECT -amount_usd INTO v_existing FROM wallet_credits WHERE operation_key='reserve:'||p_kind||':'||p_order;
 IF FOUND THEN RETURN v_existing; END IF;
 SELECT LEAST(GREATEST(COALESCE(SUM(amount_usd),0),0),round(p_limit,2)) INTO v_amount FROM wallet_credits WHERE user_id=v_uid AND stripe_environment=p_environment;
 IF v_amount>0 THEN INSERT INTO wallet_credits(user_id,amount_usd,reason,order_id,order_kind,stripe_environment,operation_key) VALUES(v_uid,-v_amount,'uso_en_pedido',p_order,p_kind,p_environment,'reserve:'||p_kind||':'||p_order); END IF;
 RETURN v_amount;
END $$;
REVOKE ALL ON FUNCTION public.reserve_order_credit(text,uuid,numeric,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_order_credit(text,uuid,numeric,text) TO service_role;
CREATE FUNCTION public.release_order_credit(p_kind text,p_order uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE w record; o record;
BEGIN
 SELECT * INTO w FROM wallet_credits WHERE operation_key='reserve:'||p_kind||':'||p_order;
 IF NOT FOUND THEN RETURN; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(w.user_id::text||':'||w.stripe_environment,0));
 IF p_kind='store' THEN SELECT estado,monto_capturado INTO o FROM store_orders WHERE id=p_order; ELSE SELECT estado,monto_capturado INTO o FROM pedidos WHERE id=p_order; END IF;
 IF o.estado IS DISTINCT FROM 'cancelado' OR COALESCE(o.monto_capturado,0)>0 THEN RAISE EXCEPTION 'Solo se devuelve saldo de pedidos cancelados sin cobro'; END IF;
 INSERT INTO wallet_credits(user_id,amount_usd,reason,order_id,order_kind,stripe_environment,operation_key) VALUES(w.user_id,-w.amount_usd,'devolucion_saldo',p_order,p_kind,w.stripe_environment,'release:'||p_kind||':'||p_order) ON CONFLICT(operation_key) WHERE operation_key IS NOT NULL DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.release_order_credit(text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.release_order_credit(text,uuid) TO service_role;
CREATE FUNCTION public.grant_captured_referral(p_kind text,p_order uuid,p_environment text,p_block_reason text DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o record; v_referrer uuid; v_reward uuid;
BEGIN
 IF p_kind='store' THEN SELECT cliente_id,monto_capturado,stripe_environment,subtotal INTO o FROM store_orders WHERE id=p_order; ELSIF p_kind='cookie' THEN SELECT cliente_id,monto_capturado,stripe_environment,subtotal INTO o FROM pedidos WHERE id=p_order; ELSE RAISE EXCEPTION 'Origen inválido'; END IF;
 IF o.cliente_id IS NULL OR o.stripe_environment IS DISTINCT FROM p_environment OR p_environment NOT IN ('sandbox','live') OR COALESCE(o.monto_capturado,0)<=0 OR COALESCE(o.subtotal,0)<=0 THEN RETURN false; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('referee:'||o.cliente_id::text||':'||p_environment,0));
 SELECT referred_by INTO v_referrer FROM profiles WHERE id=o.cliente_id;
 IF v_referrer IS NULL OR v_referrer=o.cliente_id THEN RETURN false; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_referrer::text||':'||p_environment,0));
 INSERT INTO referral_rewards(referrer_id,referee_id,status,block_reason,order_id,amount_usd,order_kind,stripe_environment) VALUES(v_referrer,o.cliente_id,CASE WHEN p_block_reason IS NULL THEN 'pagado' ELSE 'bloqueado' END,p_block_reason,p_order,CASE WHEN p_block_reason IS NULL THEN 5 ELSE 0 END,p_kind,p_environment) ON CONFLICT DO NOTHING RETURNING id INTO v_reward;
 IF v_reward IS NULL OR p_block_reason IS NOT NULL THEN RETURN false; END IF;
 INSERT INTO wallet_credits(user_id,amount_usd,reason,order_id,order_kind,stripe_environment,operation_key) VALUES(v_referrer,5,'referido',p_order,p_kind,p_environment,'reward:'||v_reward);
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.grant_captured_referral(text,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.grant_captured_referral(text,uuid,text,text) TO service_role;
CREATE FUNCTION public.request_wallet_withdrawal(p_amount numeric,p_environment text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_uid uuid:=auth.uid(); v_balance numeric; v_id uuid;
BEGIN
 IF v_uid IS NULL OR p_environment NOT IN ('sandbox','live') OR p_amount IS NULL OR p_amount<=0 OR p_amount<>round(p_amount,2) THEN RAISE EXCEPTION 'Importe inválido'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_uid::text||':'||p_environment,0));
 SELECT COALESCE(SUM(amount_usd),0) INTO v_balance FROM wallet_credits WHERE user_id=v_uid AND stripe_environment=p_environment;
 IF p_amount>v_balance THEN RAISE EXCEPTION 'Saldo insuficiente'; END IF;
 INSERT INTO withdrawal_requests(profile_id,amount_usd,status,source,stripe_environment) VALUES(v_uid,p_amount,'pending','referral',p_environment) RETURNING id INTO v_id;
 INSERT INTO wallet_credits(user_id,amount_usd,reason,stripe_environment,operation_key) VALUES(v_uid,-p_amount,'retiro_pendiente',p_environment,'withdraw:'||v_id);
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.request_wallet_withdrawal(numeric,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.request_wallet_withdrawal(numeric,text) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.admin_process_withdrawal(p_withdrawal_id uuid,p_action text,p_notes text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE w record;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF p_action NOT IN ('paid_out','rejected') THEN RAISE EXCEPTION 'Invalid action'; END IF;
 SELECT * INTO w FROM withdrawal_requests WHERE id=p_withdrawal_id FOR UPDATE;
 IF w.id IS NULL OR w.status<>'pending' THEN RAISE EXCEPTION 'Solicitud no disponible'; END IF;
 IF p_action='paid_out' AND w.source='referral' AND NULLIF(trim(p_notes),'') IS NULL THEN RAISE EXCEPTION 'Registra una referencia del pago realizado'; END IF;
 IF w.source='referral' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(w.profile_id::text||':'||w.stripe_environment,0));
  IF p_action='rejected' THEN INSERT INTO wallet_credits(user_id,amount_usd,reason,stripe_environment,operation_key) VALUES(w.profile_id,w.amount_usd,'retiro_devuelto',w.stripe_environment,'withdraw-return:'||w.id) ON CONFLICT(operation_key) WHERE operation_key IS NOT NULL DO NOTHING; END IF;
 ELSE
  UPDATE affiliate_commissions SET status=CASE WHEN p_action='paid_out' THEN 'paid_out' ELSE 'available' END WHERE affiliate_profile_id=w.profile_id AND status='requested';
 END IF;
 UPDATE withdrawal_requests SET status=p_action,notes=COALESCE(p_notes,notes),updated_at=now() WHERE id=w.id;
END $$;
REVOKE ALL ON FUNCTION public.admin_process_withdrawal(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_process_withdrawal(uuid,text,text) TO authenticated,service_role;
CREATE FUNCTION public.protect_cookie_money() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF auth.role()='authenticated' THEN
 IF TG_OP='INSERT' AND (NEW.propina<0 OR NEW.credito_aplicado<>0) THEN RAISE EXCEPTION 'Importes inválidos'; END IF;
 IF TG_OP='UPDATE' AND (NEW.propina IS DISTINCT FROM OLD.propina OR NEW.credito_aplicado IS DISTINCT FROM OLD.credito_aplicado OR NEW.stripe_environment IS DISTINCT FROM OLD.stripe_environment) THEN RAISE EXCEPTION 'El sistema actualiza estos importes'; END IF;
 END IF; RETURN NEW; END $$;
CREATE TRIGGER pedidos_protect_credit BEFORE INSERT OR UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.protect_cookie_money();