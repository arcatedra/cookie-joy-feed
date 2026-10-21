ALTER TABLE public.pedidos ADD COLUMN cargo_procesamiento numeric(12,2), ADD COLUMN procesamiento_version smallint;
ALTER TABLE public.store_orders ADD COLUMN cargo_procesamiento numeric(12,2), ADD COLUMN procesamiento_version smallint;
ALTER TABLE public.pedidos ADD CONSTRAINT pedidos_processing_valid CHECK ((procesamiento_version IS NULL AND cargo_procesamiento IS NULL) OR (procesamiento_version = 1 AND cargo_procesamiento >= 0));
ALTER TABLE public.store_orders ADD CONSTRAINT store_orders_processing_valid CHECK ((procesamiento_version IS NULL AND cargo_procesamiento IS NULL) OR (procesamiento_version = 1 AND cargo_procesamiento >= 0));
CREATE OR REPLACE FUNCTION public.protect_processing_fields() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF coalesce(auth.role(), '') <> 'service_role' THEN
  IF TG_OP = 'INSERT' THEN
   IF NEW.cargo_procesamiento IS NOT NULL OR NEW.procesamiento_version IS NOT NULL THEN RAISE EXCEPTION 'El cargo de procesamiento solo lo guarda el sistema'; END IF;
  ELSIF NEW.cargo_procesamiento IS DISTINCT FROM OLD.cargo_procesamiento OR NEW.procesamiento_version IS DISTINCT FROM OLD.procesamiento_version THEN
   RAISE EXCEPTION 'El cargo de procesamiento solo lo guarda el sistema';
  END IF;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER pedidos_protect_processing BEFORE INSERT OR UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.protect_processing_fields();
CREATE TRIGGER store_orders_protect_processing BEFORE INSERT OR UPDATE ON public.store_orders FOR EACH ROW EXECUTE FUNCTION public.protect_processing_fields();