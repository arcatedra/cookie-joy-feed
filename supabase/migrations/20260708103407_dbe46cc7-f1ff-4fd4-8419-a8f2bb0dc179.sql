
-- 1. Fix order_messages INSERT policy — remove impersonation vector.
--    courier_orders has no customer linkage column, so restrict INSERTs to the
--    driver assigned to the order. Non-driver participants cannot send messages
--    via RLS; anything else must be gated server-side with supabaseAdmin after
--    verifying ownership.
DROP POLICY IF EXISTS "Participants send messages" ON public.order_messages;
CREATE POLICY "Participants send messages"
  ON public.order_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND sender_role = 'driver'
    AND EXISTS (
      SELECT 1 FROM public.courier_orders o
      WHERE o.id = order_messages.order_id
        AND o.driver_id = auth.uid()
    )
  );

-- 2. Attach the businesses_protect_admin_fields trigger so owners cannot
--    self-approve or edit admin-only columns (status, approved_at, approved_by,
--    rejection_reason, owner_user_id).
DROP TRIGGER IF EXISTS businesses_protect_admin_fields_trg ON public.businesses;
CREATE TRIGGER businesses_protect_admin_fields_trg
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.businesses_protect_admin_fields();

-- 3. Attach the drivers_protect_admin_fields trigger so drivers cannot
--    self-approve or edit trust/approval fields (application_status,
--    rejection_reason, approved_at/by, rejected_at/by, self-activation
--    without approval). Additionally lock rating, total_deliveries, and
--    stripe_* payout fields to admin/service_role updates.
CREATE OR REPLACE FUNCTION public.drivers_protect_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  role_name TEXT := current_setting('request.jwt.claim.role', true);
  is_admin BOOLEAN := FALSE;
  uid UUID := auth.uid();
BEGIN
  IF role_name = 'service_role' OR uid IS NULL THEN
    RETURN NEW;
  END IF;
  IF uid IS NOT NULL THEN
    is_admin := public.has_role(uid, 'admin'::public.app_role);
  END IF;
  IF is_admin THEN RETURN NEW; END IF;

  IF NEW.application_status IS DISTINCT FROM OLD.application_status THEN
    RAISE EXCEPTION 'drivers.application_status is admin-only';
  END IF;
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    IF NEW.is_active = TRUE AND OLD.application_status <> 'aprobado' THEN
      RAISE EXCEPTION 'Cannot activate an unapproved driver';
    END IF;
  END IF;
  IF NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
    RAISE EXCEPTION 'drivers.rejection_reason is admin-only';
  END IF;
  IF NEW.approved_at IS DISTINCT FROM OLD.approved_at
     OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
     OR NEW.rejected_at IS DISTINCT FROM OLD.rejected_at
     OR NEW.rejected_by IS DISTINCT FROM OLD.rejected_by THEN
    RAISE EXCEPTION 'drivers approval bookkeeping is admin-only';
  END IF;
  IF NEW.rating IS DISTINCT FROM OLD.rating THEN
    RAISE EXCEPTION 'drivers.rating is system-managed';
  END IF;
  IF NEW.total_deliveries IS DISTINCT FROM OLD.total_deliveries THEN
    RAISE EXCEPTION 'drivers.total_deliveries is system-managed';
  END IF;
  IF NEW.stripe_account_id IS DISTINCT FROM OLD.stripe_account_id
     OR NEW.stripe_payouts_enabled IS DISTINCT FROM OLD.stripe_payouts_enabled
     OR NEW.stripe_onboarding_status IS DISTINCT FROM OLD.stripe_onboarding_status
     OR NEW.stripe_updated_at IS DISTINCT FROM OLD.stripe_updated_at THEN
    RAISE EXCEPTION 'drivers stripe fields are system-managed';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS drivers_protect_admin_fields_trg ON public.drivers;
CREATE TRIGGER drivers_protect_admin_fields_trg
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.drivers_protect_admin_fields();
