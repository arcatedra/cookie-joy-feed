ALTER TABLE public.shipping_quotes ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'saved', ADD COLUMN IF NOT EXISTS error_message text;

ALTER TABLE public.shipping_quotes ADD CONSTRAINT shipping_quotes_status_check CHECK (status IN ('saved', 'failed'));

UPDATE public.shipping_quotes SET status = 'saved' WHERE status IS NULL;