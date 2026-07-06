
-- ============ businesses ============
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL CHECK (business_type IN ('supermercado','tienda','panaderia','farmacia','otro')),
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','aprobado','rechazado','suspendido')),
  rejection_reason TEXT,
  logo_url TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_businesses_owner ON public.businesses(owner_user_id);
CREATE INDEX idx_businesses_status ON public.businesses(status);

GRANT SELECT, INSERT, UPDATE ON public.businesses TO authenticated;
GRANT SELECT ON public.businesses TO anon;
GRANT ALL ON public.businesses TO service_role;

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own business"
  ON public.businesses FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());

CREATE POLICY "Public views approved businesses"
  ON public.businesses FOR SELECT TO anon, authenticated
  USING (status = 'aprobado');

CREATE POLICY "Admins view all businesses"
  ON public.businesses FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users register their own business"
  ON public.businesses FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Owners update own business"
  ON public.businesses FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Admins update any business"
  ON public.businesses FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Guard: owners cannot change admin-only fields
CREATE OR REPLACE FUNCTION public.businesses_protect_admin_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  is_admin BOOLEAN := FALSE;
  role_name TEXT := current_setting('request.jwt.claim.role', true);
BEGIN
  IF role_name = 'service_role' OR uid IS NULL THEN RETURN NEW; END IF;
  is_admin := public.has_role(uid, 'admin'::app_role);
  IF is_admin THEN
    -- Auto-set approved_at/by on transition to aprobado
    IF NEW.status = 'aprobado' AND (OLD.status IS DISTINCT FROM 'aprobado') THEN
      NEW.approved_at := COALESCE(NEW.approved_at, now());
      NEW.approved_by := COALESCE(NEW.approved_by, uid);
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'businesses.status is admin-only';
  END IF;
  IF NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
    RAISE EXCEPTION 'businesses.rejection_reason is admin-only';
  END IF;
  IF NEW.approved_at IS DISTINCT FROM OLD.approved_at
     OR NEW.approved_by IS DISTINCT FROM OLD.approved_by THEN
    RAISE EXCEPTION 'businesses approval bookkeeping is admin-only';
  END IF;
  IF NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id THEN
    RAISE EXCEPTION 'businesses.owner_user_id is read-only';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_businesses_protect_admin_fields
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.businesses_protect_admin_fields();

CREATE TRIGGER trg_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ business_products ============
CREATE TABLE public.business_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_business_products_business ON public.business_products(business_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_products TO authenticated;
GRANT SELECT ON public.business_products TO anon;
GRANT ALL ON public.business_products TO service_role;

ALTER TABLE public.business_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public views products of approved businesses"
  ON public.business_products FOR SELECT TO anon, authenticated
  USING (
    is_active = TRUE
    AND business_id IN (SELECT id FROM public.businesses WHERE status = 'aprobado')
  );

CREATE POLICY "Owners view own products"
  ON public.business_products FOR SELECT TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_user_id = auth.uid()));

CREATE POLICY "Admins view all products"
  ON public.business_products FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Approved owners manage their products"
  ON public.business_products FOR ALL TO authenticated
  USING (
    business_id IN (
      SELECT id FROM public.businesses
      WHERE owner_user_id = auth.uid() AND status = 'aprobado'
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses
      WHERE owner_user_id = auth.uid() AND status = 'aprobado'
    )
  );

CREATE POLICY "Admins manage any products"
  ON public.business_products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_business_products_updated_at
  BEFORE UPDATE ON public.business_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ business_offers ============
CREATE TABLE public.business_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.business_products(id) ON DELETE CASCADE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('porcentaje','monto_fijo')),
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value >= 0),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_business_offers_business ON public.business_offers(business_id);
CREATE INDEX idx_business_offers_product ON public.business_offers(product_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_offers TO authenticated;
GRANT SELECT ON public.business_offers TO anon;
GRANT ALL ON public.business_offers TO service_role;

ALTER TABLE public.business_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public views active offers of approved businesses"
  ON public.business_offers FOR SELECT TO anon, authenticated
  USING (
    is_active = TRUE
    AND business_id IN (SELECT id FROM public.businesses WHERE status = 'aprobado')
  );

CREATE POLICY "Owners view own offers"
  ON public.business_offers FOR SELECT TO authenticated
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_user_id = auth.uid()));

CREATE POLICY "Admins view all offers"
  ON public.business_offers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Approved owners manage their offers"
  ON public.business_offers FOR ALL TO authenticated
  USING (
    business_id IN (
      SELECT id FROM public.businesses
      WHERE owner_user_id = auth.uid() AND status = 'aprobado'
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses
      WHERE owner_user_id = auth.uid() AND status = 'aprobado'
    )
  );

CREATE POLICY "Admins manage any offers"
  ON public.business_offers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_business_offers_updated_at
  BEFORE UPDATE ON public.business_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
