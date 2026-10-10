ALTER TABLE public.store_orders ADD COLUMN pricing_model text; ALTER TABLE public.store_orders ALTER COLUMN pricing_model SET DEFAULT 'batch_v1'; ALTER TABLE public.pedidos ADD COLUMN driver_pricing_model text; ALTER TABLE public.pedidos ALTER COLUMN driver_pricing_model SET DEFAULT 'batch_v1';
CREATE OR REPLACE FUNCTION public.enforce_driver_batch_capacity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE v_driver uuid; v_limit integer; v_load integer; v_new integer; BEGIN
IF TG_TABLE_NAME='store_orders' THEN v_driver:=NEW.repartidor_id; IF v_driver IS NULL OR v_driver IS NOT DISTINCT FROM OLD.repartidor_id THEN RETURN NEW; END IF; v_new:=1;
ELSE v_driver:=NEW.driver_id; IF v_driver IS NULL OR v_driver IS NOT DISTINCT FROM OLD.driver_id THEN RETURN NEW; END IF; SELECT count(*) INTO v_new FROM public.route_stops WHERE route_id=NEW.id AND status::text NOT IN ('entregado','fallido'); END IF;
PERFORM pg_advisory_xact_lock(hashtextextended('driver-load:'||v_driver::text,0));
SELECT coalesce(max(CASE lower(vehicle_type) WHEN 'van' THEN 10 WHEN 'auto' THEN 6 WHEN 'carro' THEN 6 WHEN 'car' THEN 6 ELSE 3 END),3) INTO v_limit FROM public.driver_vehicles WHERE driver_id=v_driver;
SELECT count(*) INTO v_load FROM public.store_orders WHERE repartidor_id=v_driver AND estado_entrega IN ('tomado','recogido','en_camino');
SELECT v_load+count(*) INTO v_load FROM public.route_stops s JOIN public.delivery_routes r ON r.id=s.route_id WHERE r.driver_id=v_driver AND r.status::text IN ('asignada','en_transito') AND s.status::text NOT IN ('entregado','fallido');
IF v_load+v_new>v_limit THEN RAISE EXCEPTION 'Tu vehículo admite hasta % pedidos por lote; ya tienes % en curso',v_limit,v_load; END IF; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.enforce_driver_batch_capacity() FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.enforce_driver_batch_capacity() TO service_role;
CREATE TRIGGER enforce_store_driver_capacity BEFORE UPDATE OF repartidor_id ON public.store_orders FOR EACH ROW EXECUTE FUNCTION public.enforce_driver_batch_capacity();
CREATE TRIGGER enforce_cookie_driver_capacity BEFORE UPDATE OF driver_id ON public.delivery_routes FOR EACH ROW EXECUTE FUNCTION public.enforce_driver_batch_capacity();
CREATE OR REPLACE FUNCTION public.register_cookie_delivery_tip() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE v_driver uuid; o record; v_base numeric; BEGIN
IF NEW.status::text<>'entregado' THEN RETURN NEW; END IF;
SELECT driver_id INTO v_driver FROM public.delivery_routes WHERE id=NEW.route_id;
SELECT id,propina,monto_capturado,stripe_environment,driver_pricing_model INTO o FROM public.pedidos WHERE id=NEW.order_id;
IF v_driver IS NULL OR o.id IS NULL OR coalesce(o.monto_capturado,0)<=0 OR o.stripe_environment NOT IN ('sandbox','live') THEN RETURN NEW; END IF;
v_base:=CASE WHEN o.driver_pricing_model='batch_v1' THEN 5 ELSE 0 END;
IF v_base+coalesce(o.propina,0)<=0 THEN RETURN NEW; END IF;
INSERT INTO public.driver_payouts(driver_id,order_id,cookie_order_id,tier_amount_usd,weight_amount_usd,tip_amount_usd,amount_usd,status) VALUES(v_driver,NULL,o.id,v_base,0,coalesce(o.propina,0),v_base+coalesce(o.propina,0),'pendiente') ON CONFLICT(cookie_order_id) DO NOTHING; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.register_cookie_delivery_tip() FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.register_cookie_delivery_tip() TO service_role;
CREATE OR REPLACE FUNCTION public.register_cookie_tip_after_capture() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF coalesce(NEW.monto_capturado,0)>0 AND (coalesce(NEW.propina,0)>0 OR NEW.driver_pricing_model='batch_v1') THEN UPDATE public.route_stops SET status=status WHERE order_id=NEW.id AND status='entregado'; END IF; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.register_cookie_tip_after_capture() FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.register_cookie_tip_after_capture() TO service_role;