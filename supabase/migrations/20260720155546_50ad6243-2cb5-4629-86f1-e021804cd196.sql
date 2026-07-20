-- Allow service_role writes for the payments webhook (RPC is SECURITY DEFINER already,
-- but explicit policies keep future direct writes safe).
DROP POLICY IF EXISTS "suscripciones_service_manage" ON public.suscripciones;
CREATE POLICY "suscripciones_service_manage"
  ON public.suscripciones
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.upsert_suscripcion_stripe(
  p_cliente_id uuid,
  p_stripe_sub_id text,
  p_plan text,
  p_precio numeric,
  p_moneda text,
  p_estado text,
  p_fecha_inicio timestamp with time zone,
  p_fecha_renovacion timestamp with time zone,
  p_fecha_cancelacion timestamp with time zone
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  -- 1) Same Stripe subscription id → idempotent update.
  SELECT id INTO v_id
    FROM public.suscripciones
   WHERE stripe_subscription_id = p_stripe_sub_id
   LIMIT 1;

  IF v_id IS NOT NULL THEN
    UPDATE public.suscripciones SET
      cliente_id        = p_cliente_id,
      plan              = p_plan,
      precio            = p_precio,
      moneda            = COALESCE(p_moneda, moneda),
      estado            = p_estado,
      fecha_inicio      = COALESCE(fecha_inicio, p_fecha_inicio),
      fecha_renovacion  = p_fecha_renovacion,
      fecha_cancelacion = p_fecha_cancelacion
     WHERE id = v_id;
    RETURN v_id;
  END IF;

  -- 2) Client already has a non-cancelled row → update it in place
  --    (no second row per user; keeps history through estado transitions).
  SELECT id INTO v_id
    FROM public.suscripciones
   WHERE cliente_id = p_cliente_id
     AND estado <> 'cancelada'
   ORDER BY creado_en DESC
   LIMIT 1;

  IF v_id IS NOT NULL THEN
    UPDATE public.suscripciones SET
      stripe_subscription_id = p_stripe_sub_id,
      plan                   = p_plan,
      precio                 = p_precio,
      moneda                 = COALESCE(p_moneda, moneda),
      estado                 = p_estado,
      fecha_inicio           = COALESCE(fecha_inicio, p_fecha_inicio),
      fecha_renovacion       = p_fecha_renovacion,
      fecha_cancelacion      = p_fecha_cancelacion
     WHERE id = v_id;
    RETURN v_id;
  END IF;

  -- 3) Fresh subscription → insert.
  INSERT INTO public.suscripciones (
    cliente_id, stripe_subscription_id, plan, precio, moneda,
    estado, fecha_inicio, fecha_renovacion, fecha_cancelacion
  ) VALUES (
    p_cliente_id, p_stripe_sub_id, p_plan, p_precio, COALESCE(p_moneda,'USD'),
    p_estado, COALESCE(p_fecha_inicio, now()), p_fecha_renovacion, p_fecha_cancelacion
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;