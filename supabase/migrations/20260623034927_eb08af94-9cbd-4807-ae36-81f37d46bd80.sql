
CREATE TABLE IF NOT EXISTS public.internal_hook_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.internal_hook_config TO service_role;

ALTER TABLE public.internal_hook_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only"
  ON public.internal_hook_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.notify_winner_via_hook()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hook_url    TEXT;
  hook_secret TEXT;
BEGIN
  SELECT value INTO hook_url    FROM public.internal_hook_config WHERE key = 'notify_winner_url';
  SELECT value INTO hook_secret FROM public.internal_hook_config WHERE key = 'notify_winner_secret';

  IF hook_url IS NULL OR hook_secret IS NULL
     OR length(hook_url) = 0 OR length(hook_secret) = 0 THEN
    RAISE WARNING 'notify_winner_via_hook: hook URL/secret not configured';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := hook_url,
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || hook_secret
               ),
    body    := jsonb_build_object(
                 'draw_date', NEW.draw_date,
                 'claim_id',  NEW.id
               )
  );

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_winner_via_hook() FROM PUBLIC, anon, authenticated;
