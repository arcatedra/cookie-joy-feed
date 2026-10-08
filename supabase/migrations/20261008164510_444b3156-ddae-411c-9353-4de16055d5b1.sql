CREATE OR REPLACE FUNCTION public.grant_captured_referral(p_kind text,p_order uuid,p_environment text,p_block_reason text DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o record; v_referrer uuid; v_reward uuid; v_phone text; v_address text; v_block text:=p_block_reason; v_fp record;
BEGIN
 IF p_environment IS NULL OR p_environment NOT IN ('sandbox','live') THEN RETURN false; END IF;
 IF p_kind='store' THEN SELECT cliente_id,monto_capturado,stripe_environment,subtotal,direccion_envio,capturado_en INTO o FROM store_orders WHERE id=p_order; ELSIF p_kind='cookie' THEN SELECT cliente_id,monto_capturado,stripe_environment,subtotal,direccion_envio,capturado_en INTO o FROM pedidos WHERE id=p_order; ELSE RAISE EXCEPTION 'Origen inválido'; END IF;
 IF NOT FOUND OR o.cliente_id IS NULL OR o.stripe_environment IS DISTINCT FROM p_environment OR COALESCE(o.monto_capturado,0)<=0 OR COALESCE(o.subtotal,0)<=0 THEN RETURN false; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('referee:'||o.cliente_id::text||':'||p_environment,0));
 IF EXISTS(SELECT 1 FROM referral_rewards WHERE referee_id=o.cliente_id AND COALESCE(stripe_environment,'live')=p_environment) THEN RETURN false; END IF;
 SELECT COALESCE(c.referred_by_profile_id,p.referred_by) INTO v_referrer FROM profiles p LEFT JOIN clientes c ON c.id=p.id WHERE p.id=o.cliente_id;
 IF v_referrer IS NULL OR v_referrer=o.cliente_id THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM store_orders WHERE cliente_id=o.cliente_id AND id<>p_order AND stripe_environment=p_environment AND monto_capturado>0 AND capturado_en<o.capturado_en) OR EXISTS(SELECT 1 FROM pedidos WHERE cliente_id=o.cliente_id AND id<>p_order AND stripe_environment=p_environment AND monto_capturado>0 AND capturado_en<o.capturado_en) THEN RETURN false; END IF;
 SELECT right(regexp_replace(COALESCE(telefono,''),'[^0-9]','','g'),10) INTO v_phone FROM clientes WHERE id=o.cliente_id;
 v_address:=left(regexp_replace(lower(COALESCE(o.direccion_envio->>'street','')||COALESCE(o.direccion_envio->>'apt','')||COALESCE(o.direccion_envio->>'zip','')),'[^a-z0-9]','','g'),120);
 FOR v_fp IN SELECT kind,val FROM (VALUES ('direccion',v_address),('telefono',v_phone)) AS f(kind,val) WHERE (kind='telefono' AND length(val)=10) OR (kind='direccion' AND length(val)>5) ORDER BY kind,val LOOP
  PERFORM pg_advisory_xact_lock(hashtextextended('fingerprint:'||v_fp.kind||':'||v_fp.val,0));
  IF EXISTS(SELECT 1 FROM account_fingerprints WHERE kind=v_fp.kind AND value_norm=v_fp.val AND user_id<>o.cliente_id) THEN v_block:='duplicado_'||v_fp.kind; END IF;
  INSERT INTO account_fingerprints(user_id,kind,value_norm) VALUES(o.cliente_id,v_fp.kind,v_fp.val) ON CONFLICT DO NOTHING;
 END LOOP;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_referrer::text||':'||p_environment,0));
 INSERT INTO referral_rewards(referrer_id,referee_id,status,block_reason,order_id,amount_usd,order_kind,stripe_environment) VALUES(v_referrer,o.cliente_id,CASE WHEN v_block IS NULL THEN 'pagado' ELSE 'bloqueado' END,v_block,p_order,CASE WHEN v_block IS NULL THEN 5 ELSE 0 END,p_kind,p_environment) ON CONFLICT DO NOTHING RETURNING id INTO v_reward;
 IF v_reward IS NULL OR v_block IS NOT NULL THEN RETURN false; END IF;
 INSERT INTO wallet_credits(user_id,amount_usd,reason,order_id,order_kind,stripe_environment,operation_key) VALUES(v_referrer,5,'referido',p_order,p_kind,p_environment,'reward:'||v_reward);
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.grant_captured_referral(text,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.grant_captured_referral(text,uuid,text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.protect_referrer_link() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF NEW.referred_by IS DISTINCT FROM OLD.referred_by THEN
  IF auth.role()='authenticated' OR OLD.referred_by IS NOT NULL OR NEW.referred_by=NEW.id THEN RAISE EXCEPTION 'El vínculo de invitación no puede cambiarse'; END IF;
  IF EXISTS(SELECT 1 FROM pedidos WHERE cliente_id=NEW.id AND monto_capturado>0) OR EXISTS(SELECT 1 FROM store_orders WHERE cliente_id=NEW.id AND monto_capturado>0) THEN RAISE EXCEPTION 'La invitación debe existir antes de la primera compra'; END IF;
 END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION public.register_cookie_delivery_tip() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_driver uuid; o record;
BEGIN
 IF NEW.status::text<>'entregado' THEN RETURN NEW; END IF;
 SELECT driver_id INTO v_driver FROM delivery_routes WHERE id=NEW.route_id;
 SELECT id,propina,monto_capturado,stripe_environment INTO o FROM pedidos WHERE id=NEW.order_id;
 IF v_driver IS NULL OR o.id IS NULL OR COALESCE(o.propina,0)<=0 OR COALESCE(o.monto_capturado,0)<=0 OR o.stripe_environment NOT IN ('sandbox','live') THEN RETURN NEW; END IF;
 INSERT INTO driver_payouts(driver_id,order_id,cookie_order_id,tier_amount_usd,weight_amount_usd,tip_amount_usd,amount_usd,status) VALUES(v_driver,NULL,o.id,0,0,o.propina,o.propina,'pendiente') ON CONFLICT(cookie_order_id) DO NOTHING;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.register_cookie_delivery_tip() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER route_stop_cookie_tip AFTER INSERT OR UPDATE OF status ON public.route_stops FOR EACH ROW EXECUTE FUNCTION public.register_cookie_delivery_tip();
CREATE OR REPLACE FUNCTION public.register_cookie_tip_after_capture() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF COALESCE(NEW.monto_capturado,0)>0 AND COALESCE(NEW.propina,0)>0 THEN UPDATE route_stops SET status=status WHERE order_id=NEW.id AND status='entregado'; END IF; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.register_cookie_tip_after_capture() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER pedido_captured_cookie_tip AFTER UPDATE OF monto_capturado ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.register_cookie_tip_after_capture();
CREATE OR REPLACE FUNCTION public.protect_cookie_money() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF auth.role()='authenticated' THEN
 IF TG_OP='INSERT' AND (NEW.propina<>0 OR NEW.credito_aplicado<>0 OR COALESCE(NEW.monto_capturado,0)<>0 OR NEW.estado<>'pendiente' OR NEW.stripe_payment_intent_id IS NOT NULL) THEN RAISE EXCEPTION 'Los pagos solo los crea el sistema'; END IF;
 IF TG_OP='UPDATE' AND (NEW.propina IS DISTINCT FROM OLD.propina OR NEW.credito_aplicado IS DISTINCT FROM OLD.credito_aplicado OR NEW.stripe_environment IS DISTINCT FROM OLD.stripe_environment OR NEW.monto_capturado IS DISTINCT FROM OLD.monto_capturado) THEN RAISE EXCEPTION 'El sistema actualiza estos importes'; END IF;
 END IF; RETURN NEW; END $$;