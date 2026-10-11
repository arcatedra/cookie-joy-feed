GRANT SELECT ON public.delivery_block_settings TO anon;
CREATE POLICY delivery_block_settings_public_read ON public.delivery_block_settings FOR SELECT TO anon USING (true);

ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS door_service text NOT NULL DEFAULT 'lobby';
ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS door_service_fee numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS is_cold boolean NOT NULL DEFAULT false;
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS requires_safe_return boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.protect_store_block_fields() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR auth.role()='service_role' OR public.has_role(auth.uid(),'admin') THEN RETURN NEW; END IF;
 IF NEW.pricing_model IS DISTINCT FROM OLD.pricing_model OR NEW.door_service IS DISTINCT FROM OLD.door_service OR NEW.door_service_fee IS DISTINCT FROM OLD.door_service_fee THEN
   RAISE EXCEPTION 'Estos datos solo los cambia el sistema';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.protect_store_block_fields() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER protect_store_block_fields_before_update BEFORE UPDATE ON public.store_orders FOR EACH ROW EXECUTE FUNCTION public.protect_store_block_fields();