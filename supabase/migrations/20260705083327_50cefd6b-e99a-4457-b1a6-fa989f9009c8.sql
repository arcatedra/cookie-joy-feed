-- Lock down amoe_entries writes: only service_role and SECURITY DEFINER submit_amoe_entry may write.
REVOKE INSERT, UPDATE, DELETE ON public.amoe_entries FROM anon, authenticated;

-- Explicit deny policies so intent is clear and any accidental direct write is blocked by RLS
CREATE POLICY "No direct client inserts on amoe_entries"
  ON public.amoe_entries FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "No direct client updates on amoe_entries"
  ON public.amoe_entries FOR UPDATE
  TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "No direct client deletes on amoe_entries"
  ON public.amoe_entries FOR DELETE
  TO anon, authenticated
  USING (false);