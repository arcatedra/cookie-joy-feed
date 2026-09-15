ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS monto_autorizado numeric,
  ADD COLUMN IF NOT EXISTS monto_capturado numeric,
  ADD COLUMN IF NOT EXISTS autorizado_en timestamptz,
  ADD COLUMN IF NOT EXISTS capturado_en timestamptz,
  ADD COLUMN IF NOT EXISTS captura_intentos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS captura_error text,
  ADD COLUMN IF NOT EXISTS flujo_pago text NOT NULL DEFAULT 'captura_inmediata';

COMMENT ON COLUMN public.pedidos.flujo_pago IS 'captura_inmediata = pedidos antiguos (se cobra al pedir); autorizacion_diferida = se reserva y se cobra el monto real al empacar';

INSERT INTO public.delivery_settings (key, value_int)
VALUES ('auth_buffer_pct', 15)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.delivery_settings (key, value_int)
VALUES ('auth_buffer_min_cents', 500)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.auth_buffer_settings()
RETURNS TABLE(pct integer, min_cents integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT value_int FROM public.delivery_settings WHERE key = 'auth_buffer_pct'), 15),
    COALESCE((SELECT value_int FROM public.delivery_settings WHERE key = 'auth_buffer_min_cents'), 500);
$$;

REVOKE ALL ON FUNCTION public.auth_buffer_settings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.auth_buffer_settings() TO authenticated, service_role;