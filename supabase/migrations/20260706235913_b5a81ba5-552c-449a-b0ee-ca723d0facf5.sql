
-- Hacer complete_driver_payout idempotente (no falla si ya está completado con el mismo stripe id)
CREATE OR REPLACE FUNCTION public.complete_driver_payout(p_payout_id UUID, p_stripe_payout_id TEXT)
RETURNS public.driver_payouts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payout public.driver_payouts;
  v_current public.driver_payouts;
BEGIN
  SELECT * INTO v_current FROM public.driver_payouts WHERE id = p_payout_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payout no encontrado';
  END IF;

  -- Idempotencia: si ya está completado, devolver sin cambios
  IF v_current.status = 'completado' THEN
    RETURN v_current;
  END IF;

  IF v_current.status <> 'procesando' THEN
    RAISE EXCEPTION 'Payout no está en proceso (estado: %)', v_current.status;
  END IF;

  UPDATE public.driver_payouts
     SET status = 'completado',
         stripe_payout_id = COALESCE(p_stripe_payout_id, stripe_payout_id),
         completed_at = now()
   WHERE id = p_payout_id
  RETURNING * INTO v_payout;

  RETURN v_payout;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_driver_payout(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_driver_payout(UUID, TEXT) TO service_role;

-- Extender reverse_failed_payout: idempotente + soporta revertir un payout ya "completado"
-- (caso: Stripe primero reporta paid y luego el banco lo rechaza días después).
CREATE OR REPLACE FUNCTION public.reverse_failed_payout(p_payout_id UUID, p_reason TEXT)
RETURNS public.driver_payouts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payout public.driver_payouts;
BEGIN
  SELECT * INTO v_payout FROM public.driver_payouts
   WHERE id = p_payout_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payout no encontrado';
  END IF;

  -- Idempotencia: si ya está fallido, no hacer nada
  IF v_payout.status = 'fallido' THEN
    RETURN v_payout;
  END IF;

  -- Solo revertir saldo si el payout aún estaba en proceso o completado
  IF v_payout.status NOT IN ('procesando','completado') THEN
    RAISE EXCEPTION 'Estado inválido para revertir: %', v_payout.status;
  END IF;

  UPDATE public.driver_payouts
     SET status = 'fallido',
         stripe_error = COALESCE(p_reason, stripe_error),
         completed_at = now()
   WHERE id = p_payout_id
  RETURNING * INTO v_payout;

  -- Regresar saldo
  UPDATE public.driver_wallets
     SET available_balance = available_balance + v_payout.amount_requested,
         updated_at = now()
   WHERE driver_id = v_payout.driver_id;

  -- Ledger entry (reversion positiva)
  INSERT INTO public.wallet_transactions (driver_id, type, amount, payout_id, description)
  VALUES (v_payout.driver_id, 'reversion', v_payout.amount_requested, v_payout.id,
          'Retiro revertido: ' || COALESCE(p_reason,'error'));

  RETURN v_payout;
END;
$$;

REVOKE ALL ON FUNCTION public.reverse_failed_payout(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reverse_failed_payout(UUID, TEXT) TO service_role;

-- Índice para lookup rápido por stripe_payout_id (usado por webhook)
CREATE INDEX IF NOT EXISTS idx_driver_payouts_stripe_id
  ON public.driver_payouts (stripe_payout_id)
  WHERE stripe_payout_id IS NOT NULL;

-- Índice para lookup rápido por stripe_account_id en drivers (usado por account.updated)
CREATE INDEX IF NOT EXISTS idx_drivers_stripe_account
  ON public.drivers (stripe_account_id)
  WHERE stripe_account_id IS NOT NULL;
