
-- Trigger: notify winner via HTTP hook when a winner_claim is created.
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.notify_winner_via_hook()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hook_url   TEXT;
  hook_secret TEXT;
BEGIN
  -- Configured via ALTER DATABASE ... SET app.* (set below)
  hook_url    := current_setting('app.notify_winner_url', true);
  hook_secret := current_setting('app.notify_winner_secret', true);

  IF hook_url IS NULL OR hook_secret IS NULL
     OR length(hook_url) = 0 OR length(hook_secret) = 0 THEN
    RAISE WARNING 'notify_winner_via_hook: app.notify_winner_url / secret not configured';
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

DROP TRIGGER IF EXISTS trg_notify_winner ON public.winner_claims;
CREATE TRIGGER trg_notify_winner
AFTER INSERT ON public.winner_claims
FOR EACH ROW EXECUTE FUNCTION public.notify_winner_via_hook();
