-- Fix 1: driver_documents — close status-reset bypass.
CREATE OR REPLACE FUNCTION public.driver_documents_protect_review_fields()
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
  IF role_name = 'service_role' OR uid IS NULL THEN RETURN NEW; END IF;
  IF uid IS NOT NULL THEN is_admin := public.has_role(uid, 'admin'::public.app_role); END IF;
  IF is_admin THEN RETURN NEW; END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'pendiente'::driver_document_status
       AND OLD.status = 'rechazado'::driver_document_status THEN
      NULL; -- allowed: replacing a rejected doc resets to pendiente
    ELSE
      RAISE EXCEPTION 'driver_documents.status is admin-only';
    END IF;
  END IF;
  IF NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
     OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN
    RAISE EXCEPTION 'driver_documents review fields are admin-only';
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix 2: order_messages — Mark-read policy must verify the user is a real
-- participant of the order: the assigned driver, OR a customer who has
-- already sent a message in this order's thread.
DROP POLICY IF EXISTS "Mark read by recipient" ON public.order_messages;

CREATE POLICY "Mark read by recipient"
ON public.order_messages
FOR UPDATE
TO authenticated
USING (
  sender_id <> auth.uid()
  AND (
    EXISTS (
      SELECT 1 FROM public.courier_orders o
      WHERE o.id = order_messages.order_id AND o.driver_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.order_messages m2
      WHERE m2.order_id = order_messages.order_id
        AND m2.sender_id = auth.uid()
        AND m2.sender_role = 'customer'
    )
  )
)
WITH CHECK (
  sender_id <> auth.uid()
  AND (
    EXISTS (
      SELECT 1 FROM public.courier_orders o
      WHERE o.id = order_messages.order_id AND o.driver_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.order_messages m2
      WHERE m2.order_id = order_messages.order_id
        AND m2.sender_id = auth.uid()
        AND m2.sender_role = 'customer'
    )
  )
);

-- Fix 3: reel_comments — document the public-broadcast contract.
COMMENT ON TABLE public.reel_comments IS
  'PUBLIC BROADCAST: rows are readable by anon+authenticated (RLS USING true) and published to Realtime. Do NOT add any column containing PII, moderation state, private identifiers, IPs, emails, or any non-public data without re-evaluating the SELECT policy and Realtime publication first. New columns are exposed publicly by default.';