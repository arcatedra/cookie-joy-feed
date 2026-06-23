-- 1) Tighten the owner UPDATE policy: only while pending and before submission
DROP POLICY IF EXISTS winner_claims_owner_update ON public.winner_claims;

CREATE POLICY winner_claims_owner_update ON public.winner_claims
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND deleted_at IS NULL
    AND status = 'pending_verification'
    AND submitted_at IS NULL
  )
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending_verification'
  );

-- 2) Column-level immutability guard for non-admin updates (defense in depth)
CREATE OR REPLACE FUNCTION public.winner_claims_owner_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin BOOLEAN := FALSE;
  uid UUID := auth.uid();
BEGIN
  IF uid IS NOT NULL THEN
    is_admin := public.has_role(uid, 'admin'::app_role);
  END IF;

  -- Admins (and DB-internal roles with no auth.uid) bypass the column lock
  IF is_admin OR uid IS NULL THEN
    RETURN NEW;
  END IF;

  -- Owner-editable columns: name/address/dob/phone, payment + document fields,
  -- the submitted timestamp, and the updated_at bookkeeping column.
  IF NEW.id                  IS DISTINCT FROM OLD.id                  THEN RAISE EXCEPTION 'winner_claims.id is read-only'; END IF;
  IF NEW.user_id             IS DISTINCT FROM OLD.user_id             THEN RAISE EXCEPTION 'winner_claims.user_id is read-only'; END IF;
  IF NEW.draw_date           IS DISTINCT FROM OLD.draw_date           THEN RAISE EXCEPTION 'winner_claims.draw_date is read-only'; END IF;
  IF NEW.email               IS DISTINCT FROM OLD.email               THEN RAISE EXCEPTION 'winner_claims.email is read-only'; END IF;
  IF NEW.display_name        IS DISTINCT FROM OLD.display_name        THEN RAISE EXCEPTION 'winner_claims.display_name is read-only'; END IF;
  IF NEW.prize_usd           IS DISTINCT FROM OLD.prize_usd           THEN RAISE EXCEPTION 'winner_claims.prize_usd is read-only'; END IF;
  IF NEW.status              IS DISTINCT FROM OLD.status              THEN RAISE EXCEPTION 'winner_claims.status is read-only for owners'; END IF;
  IF NEW.claim_deadline      IS DISTINCT FROM OLD.claim_deadline      THEN RAISE EXCEPTION 'winner_claims.claim_deadline is read-only'; END IF;
  IF NEW.notified_at         IS DISTINCT FROM OLD.notified_at         THEN RAISE EXCEPTION 'winner_claims.notified_at is read-only'; END IF;
  IF NEW.last_reminder_at    IS DISTINCT FROM OLD.last_reminder_at    THEN RAISE EXCEPTION 'winner_claims.last_reminder_at is read-only'; END IF;
  IF NEW.created_at          IS DISTINCT FROM OLD.created_at          THEN RAISE EXCEPTION 'winner_claims.created_at is read-only'; END IF;
  IF NEW.deleted_at          IS DISTINCT FROM OLD.deleted_at          THEN RAISE EXCEPTION 'winner_claims.deleted_at is read-only for owners'; END IF;

  -- Admin verification / payout audit columns
  IF NEW.payment_reference   IS DISTINCT FROM OLD.payment_reference   THEN RAISE EXCEPTION 'winner_claims.payment_reference is admin-only'; END IF;
  IF NEW.paid_at             IS DISTINCT FROM OLD.paid_at             THEN RAISE EXCEPTION 'winner_claims.paid_at is admin-only'; END IF;
  IF NEW.paid_by             IS DISTINCT FROM OLD.paid_by             THEN RAISE EXCEPTION 'winner_claims.paid_by is admin-only'; END IF;
  IF NEW.verified_at         IS DISTINCT FROM OLD.verified_at         THEN RAISE EXCEPTION 'winner_claims.verified_at is admin-only'; END IF;
  IF NEW.verified_by         IS DISTINCT FROM OLD.verified_by         THEN RAISE EXCEPTION 'winner_claims.verified_by is admin-only'; END IF;
  IF NEW.rejected_at         IS DISTINCT FROM OLD.rejected_at         THEN RAISE EXCEPTION 'winner_claims.rejected_at is admin-only'; END IF;
  IF NEW.rejected_by         IS DISTINCT FROM OLD.rejected_by         THEN RAISE EXCEPTION 'winner_claims.rejected_by is admin-only'; END IF;
  IF NEW.rejection_reason    IS DISTINCT FROM OLD.rejection_reason    THEN RAISE EXCEPTION 'winner_claims.rejection_reason is admin-only'; END IF;
  IF NEW.admin_notes         IS DISTINCT FROM OLD.admin_notes         THEN RAISE EXCEPTION 'winner_claims.admin_notes is admin-only'; END IF;

  -- Once the owner has submitted, the submission fields themselves become frozen.
  IF OLD.submitted_at IS NOT NULL THEN
    IF NEW.full_name           IS DISTINCT FROM OLD.full_name           THEN RAISE EXCEPTION 'Claim already submitted; field is locked'; END IF;
    IF NEW.address1            IS DISTINCT FROM OLD.address1            THEN RAISE EXCEPTION 'Claim already submitted; field is locked'; END IF;
    IF NEW.address2            IS DISTINCT FROM OLD.address2            THEN RAISE EXCEPTION 'Claim already submitted; field is locked'; END IF;
    IF NEW.city                IS DISTINCT FROM OLD.city                THEN RAISE EXCEPTION 'Claim already submitted; field is locked'; END IF;
    IF NEW.state               IS DISTINCT FROM OLD.state               THEN RAISE EXCEPTION 'Claim already submitted; field is locked'; END IF;
    IF NEW.zip                 IS DISTINCT FROM OLD.zip                 THEN RAISE EXCEPTION 'Claim already submitted; field is locked'; END IF;
    IF NEW.dob                 IS DISTINCT FROM OLD.dob                 THEN RAISE EXCEPTION 'Claim already submitted; field is locked'; END IF;
    IF NEW.phone               IS DISTINCT FROM OLD.phone               THEN RAISE EXCEPTION 'Claim already submitted; field is locked'; END IF;
    IF NEW.payment_method      IS DISTINCT FROM OLD.payment_method      THEN RAISE EXCEPTION 'Claim already submitted; field is locked'; END IF;
    IF NEW.payment_destination IS DISTINCT FROM OLD.payment_destination THEN RAISE EXCEPTION 'Claim already submitted; field is locked'; END IF;
    IF NEW.id_document_path    IS DISTINCT FROM OLD.id_document_path    THEN RAISE EXCEPTION 'Claim already submitted; field is locked'; END IF;
    IF NEW.w9_document_path    IS DISTINCT FROM OLD.w9_document_path    THEN RAISE EXCEPTION 'Claim already submitted; field is locked'; END IF;
    IF NEW.submitted_at        IS DISTINCT FROM OLD.submitted_at        THEN RAISE EXCEPTION 'Claim already submitted; field is locked'; END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger functions like this run via the trigger; revoke direct EXECUTE
REVOKE EXECUTE ON FUNCTION public.winner_claims_owner_update_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS winner_claims_owner_update_guard_trg ON public.winner_claims;
CREATE TRIGGER winner_claims_owner_update_guard_trg
  BEFORE UPDATE ON public.winner_claims
  FOR EACH ROW EXECUTE FUNCTION public.winner_claims_owner_update_guard();