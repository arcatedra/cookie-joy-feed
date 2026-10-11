DROP POLICY IF EXISTS block_stops_driver_read ON public.delivery_block_stops;
DROP POLICY IF EXISTS block_reservations_driver_insert ON public.delivery_block_reservations;
DROP POLICY IF EXISTS block_reservations_driver_update ON public.delivery_block_reservations;
REVOKE INSERT, UPDATE, DELETE ON public.delivery_block_reservations FROM authenticated;

CREATE OR REPLACE FUNCTION public.my_available_delivery_blocks()
RETURNS TABLE(id uuid, zone_name text, starts_at timestamptz, estimated_minutes integer, committed_pay numeric, tips_total numeric, door_bonus_enabled boolean, door_bonus_amount numeric, estimated_trips integer, requires_thermal_bag boolean, stops jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT b.id,b.zone_name,b.starts_at,b.estimated_minutes,b.committed_pay,b.tips_total,b.door_bonus_enabled,b.door_bonus_amount,b.estimated_trips,b.requires_thermal_bag,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('id',s.id,'size_label',s.size_label,'heavy_items',s.heavy_items,'has_cold_items',s.has_cold_items,'door_service',s.door_service) ORDER BY s.sequence_number) FROM public.delivery_block_stops s WHERE s.block_id=b.id),'[]'::jsonb)
 FROM public.delivery_blocks b JOIN public.delivery_block_settings cfg ON cfg.singleton=true
 WHERE cfg.enabled=true AND b.status='published' AND b.is_open=true AND b.assigned_driver_id IS NULL
 AND EXISTS (SELECT 1 FROM public.drivers d WHERE d.id=auth.uid() AND d.application_status='aprobado')
 ORDER BY b.starts_at;
$$;
REVOKE ALL ON FUNCTION public.my_available_delivery_blocks() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_available_delivery_blocks() TO authenticated;

CREATE OR REPLACE FUNCTION public.reserve_delivery_block(p_block uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE reservation uuid; chosen_vehicle text; capacity numeric; total_weight numeric; needs_bag boolean; has_bag boolean;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Inicia sesión'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.delivery_block_settings WHERE singleton=true AND enabled=true) THEN RAISE EXCEPTION 'Los bloques todavía no están activos'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.drivers d WHERE d.id=auth.uid() AND d.application_status='aprobado') THEN RAISE EXCEPTION 'Tu cuenta de repartidor no está aprobada'; END IF;
 SELECT v.vehicle_type,v.has_thermal_bag INTO chosen_vehicle,has_bag FROM public.driver_vehicles v WHERE v.driver_id=auth.uid() ORDER BY v.created_at DESC LIMIT 1;
 IF chosen_vehicle IS NULL THEN RAISE EXCEPTION 'Registra un vehículo antes de reservar'; END IF;
 SELECT CASE chosen_vehicle WHEN 'bicicleta' THEN bike_lb WHEN 'e-bike' THEN bike_lb WHEN 'bici_carga' THEN cargo_bike_lb WHEN 'moto' THEN motorcycle_lb WHEN 'auto' THEN car_lb WHEN 'carro' THEN car_lb WHEN 'van' THEN van_lb ELSE 0 END INTO capacity FROM public.delivery_block_settings WHERE singleton=true;
 SELECT COALESCE(sum(s.weight_lb),0),bool_or(s.has_cold_items) INTO total_weight,needs_bag FROM public.delivery_block_stops s WHERE s.block_id=p_block;
 IF total_weight>capacity THEN RAISE EXCEPTION 'Este lote supera la capacidad de tu vehículo'; END IF;
 IF needs_bag AND NOT COALESCE(has_bag,false) THEN RAISE EXCEPTION 'Este lote requiere bolsa térmica'; END IF;
 IF EXISTS (SELECT 1 FROM public.delivery_block_reservations r JOIN public.delivery_blocks b ON b.id=r.block_id WHERE r.driver_id=auth.uid() AND r.status IN ('reserved','present','assigned') AND b.status NOT IN ('completed','cancelled')) THEN RAISE EXCEPTION 'Ya tienes un lote activo'; END IF;
 PERFORM 1 FROM public.delivery_blocks b WHERE b.id=p_block AND b.status='published' AND b.is_open=true AND b.assigned_driver_id IS NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Este lote ya no está disponible'; END IF;
 INSERT INTO public.delivery_block_reservations(block_id,driver_id) VALUES(p_block,auth.uid()) RETURNING id INTO reservation;
 UPDATE public.delivery_blocks SET is_open=false,updated_at=now() WHERE id=p_block;
 RETURN reservation;
END $$;
REVOKE ALL ON FUNCTION public.reserve_delivery_block(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_delivery_block(uuid) TO authenticated;