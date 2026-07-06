
-- ============================================================
-- Wallet + Instant Payouts para repartidores
-- ============================================================

-- Enum para estados de payout
DO $$ BEGIN
  CREATE TYPE public.driver_payout_status AS ENUM ('procesando','completado','fallido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.wallet_txn_type AS ENUM ('ganancia_ruta','retiro','ajuste_admin','reversion');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- driver_wallets ----------
CREATE TABLE IF NOT EXISTS public.driver_wallets (
  driver_id UUID PRIMARY KEY REFERENCES public.drivers(id) ON DELETE CASCADE,
  available_balance NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (available_balance >= 0),
  pending_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  lifetime_earnings NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.driver_wallets TO authenticated;
GRANT ALL ON public.driver_wallets TO service_role;

ALTER TABLE public.driver_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "driver_wallets_owner_select" ON public.driver_wallets
  FOR SELECT TO authenticated
  USING (driver_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

-- ---------- wallet_transactions ----------
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  type public.wallet_txn_type NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  route_id UUID REFERENCES public.delivery_routes(id) ON DELETE SET NULL,
  payout_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_txn_driver_created
  ON public.wallet_transactions (driver_id, created_at DESC);

GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallet_txn_owner_select" ON public.wallet_transactions
  FOR SELECT TO authenticated
  USING (driver_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

-- ---------- driver_payouts ----------
CREATE TABLE IF NOT EXISTS public.driver_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  amount_requested NUMERIC(12,2) NOT NULL CHECK (amount_requested > 0),
  fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  amount_net NUMERIC(12,2) NOT NULL CHECK (amount_net > 0),
  status public.driver_payout_status NOT NULL DEFAULT 'procesando',
  stripe_payout_id TEXT,
  stripe_error TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_driver_payouts_driver
  ON public.driver_payouts (driver_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_payouts_status
  ON public.driver_payouts (status, requested_at DESC);

GRANT SELECT ON public.driver_payouts TO authenticated;
GRANT ALL ON public.driver_payouts TO service_role;

ALTER TABLE public.driver_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "driver_payouts_owner_select" ON public.driver_payouts
  FOR SELECT TO authenticated
  USING (driver_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

-- ---------- Columnas nuevas en drivers ----------
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- ---------- Trigger: acreditar saldo cuando ruta se completa ----------
CREATE OR REPLACE FUNCTION public.credit_wallet_on_route_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_short TEXT;
BEGIN
  IF NEW.status = 'completada'::route_status
     AND (OLD.status IS DISTINCT FROM 'completada'::route_status)
     AND NEW.driver_id IS NOT NULL
     AND NEW.fixed_pay > 0 THEN

    v_short := upper(substr(NEW.id::text, 1, 8));

    -- Ledger entry
    INSERT INTO public.wallet_transactions (driver_id, type, amount, route_id, description)
    VALUES (NEW.driver_id, 'ganancia_ruta', NEW.fixed_pay, NEW.id,
            'Ruta #' || v_short || ' completada');

    -- Wallet cache upsert
    INSERT INTO public.driver_wallets (driver_id, available_balance, lifetime_earnings, updated_at)
    VALUES (NEW.driver_id, NEW.fixed_pay, NEW.fixed_pay, now())
    ON CONFLICT (driver_id) DO UPDATE
      SET available_balance = public.driver_wallets.available_balance + EXCLUDED.available_balance,
          lifetime_earnings = public.driver_wallets.lifetime_earnings + EXCLUDED.lifetime_earnings,
          updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_credit_wallet_on_route_complete ON public.delivery_routes;
CREATE TRIGGER trg_credit_wallet_on_route_complete
AFTER UPDATE ON public.delivery_routes
FOR EACH ROW
EXECUTE FUNCTION public.credit_wallet_on_route_complete();

-- ---------- RPC: solicitar retiro ----------
CREATE OR REPLACE FUNCTION public.request_driver_payout(p_amount NUMERIC, p_fee NUMERIC)
RETURNS public.driver_payouts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver UUID := auth.uid();
  v_wallet public.driver_wallets;
  v_pending INT;
  v_payout public.driver_payouts;
  v_net NUMERIC(12,2);
BEGIN
  IF v_driver IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF p_amount IS NULL OR p_amount < 10 THEN
    RAISE EXCEPTION 'El monto mínimo de retiro es $10.00';
  END IF;

  v_net := p_amount - COALESCE(p_fee, 0);
  IF v_net <= 0 THEN
    RAISE EXCEPTION 'El monto neto debe ser mayor a $0';
  END IF;

  -- Bloquear wallet
  SELECT * INTO v_wallet FROM public.driver_wallets
   WHERE driver_id = v_driver FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No tienes saldo disponible';
  END IF;

  IF v_wallet.available_balance < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente. Disponible: $%', v_wallet.available_balance;
  END IF;

  -- No permitir dos retiros simultáneos
  SELECT COUNT(*) INTO v_pending FROM public.driver_payouts
   WHERE driver_id = v_driver AND status = 'procesando';
  IF v_pending > 0 THEN
    RAISE EXCEPTION 'Ya tienes un retiro en proceso';
  END IF;

  -- Crear payout
  INSERT INTO public.driver_payouts (driver_id, amount_requested, fee, amount_net, status)
  VALUES (v_driver, p_amount, COALESCE(p_fee,0), v_net, 'procesando')
  RETURNING * INTO v_payout;

  -- Descontar saldo
  UPDATE public.driver_wallets
     SET available_balance = available_balance - p_amount,
         updated_at = now()
   WHERE driver_id = v_driver;

  -- Ledger entry (retiro negativo)
  INSERT INTO public.wallet_transactions (driver_id, type, amount, payout_id, description)
  VALUES (v_driver, 'retiro', -p_amount, v_payout.id,
          'Retiro instantáneo solicitado');

  RETURN v_payout;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_driver_payout(NUMERIC, NUMERIC) TO authenticated;

-- ---------- RPC: revertir payout fallido ----------
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
   WHERE id = p_payout_id AND status = 'procesando'
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payout no encontrado o no está en proceso';
  END IF;

  UPDATE public.driver_payouts
     SET status = 'fallido',
         stripe_error = p_reason,
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
          'Retiro fallido revertido: ' || COALESCE(p_reason,'error'));

  RETURN v_payout;
END;
$$;

REVOKE ALL ON FUNCTION public.reverse_failed_payout(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reverse_failed_payout(UUID, TEXT) TO service_role;

-- ---------- RPC: marcar payout completado ----------
CREATE OR REPLACE FUNCTION public.complete_driver_payout(p_payout_id UUID, p_stripe_payout_id TEXT)
RETURNS public.driver_payouts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payout public.driver_payouts;
BEGIN
  UPDATE public.driver_payouts
     SET status = 'completado',
         stripe_payout_id = p_stripe_payout_id,
         completed_at = now()
   WHERE id = p_payout_id AND status = 'procesando'
  RETURNING * INTO v_payout;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payout no encontrado o ya finalizado';
  END IF;

  RETURN v_payout;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_driver_payout(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_driver_payout(UUID, TEXT) TO service_role;
