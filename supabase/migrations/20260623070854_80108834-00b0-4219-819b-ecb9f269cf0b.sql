ALTER TABLE public.spin_history ADD COLUMN guest_email_hash text;
DROP INDEX IF EXISTS public.spin_history_email_idx;
ALTER TABLE public.spin_history DROP COLUMN guest_email;
CREATE INDEX spin_history_guest_hash_idx ON public.spin_history(guest_email_hash) WHERE guest_email_hash IS NOT NULL;