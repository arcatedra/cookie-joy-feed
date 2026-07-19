
REVOKE EXECUTE ON FUNCTION public.crear_pedido_con_items(uuid,jsonb,numeric,numeric,numeric,numeric,text,text,text,jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.upsert_suscripcion_stripe(uuid,text,text,numeric,text,text,timestamptz,timestamptz,timestamptz) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_cliente() FROM anon, authenticated, PUBLIC;
