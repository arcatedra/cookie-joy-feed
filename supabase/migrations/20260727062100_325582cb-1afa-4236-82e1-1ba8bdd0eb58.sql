
CREATE TABLE public.affiliate_commissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  cliente_email text,
  amount_usd numeric NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','available','requested','paid_out')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.affiliate_commissions TO authenticated;
GRANT ALL ON public.affiliate_commissions TO service_role;

ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "affiliate_commissions_select_own"
  ON public.affiliate_commissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = affiliate_profile_id);

CREATE POLICY "affiliate_commissions_service_all"
  ON public.affiliate_commissions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_affiliate_commissions_affiliate ON public.affiliate_commissions(affiliate_profile_id);
CREATE INDEX idx_affiliate_commissions_cliente ON public.affiliate_commissions(cliente_id);
CREATE INDEX idx_affiliate_commissions_status ON public.affiliate_commissions(status);

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS referred_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clientes_referred_by ON public.clientes(referred_by_profile_id);

CREATE UNIQUE INDEX IF NOT EXISTS clientes_email_unique_idx ON public.clientes (lower(email));
