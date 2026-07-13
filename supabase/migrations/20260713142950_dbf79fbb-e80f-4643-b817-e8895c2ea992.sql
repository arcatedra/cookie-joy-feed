
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_hash TEXT NOT NULL,
  ip TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS login_attempts_email_hash_created_at_idx
  ON public.login_attempts (email_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS login_attempts_ip_created_at_idx
  ON public.login_attempts (ip, created_at DESC);

GRANT ALL ON public.login_attempts TO service_role;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role manages login_attempts"
  ON public.login_attempts FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.check_login_rate_limit(
  _email_hash TEXT,
  _ip TEXT
) RETURNS TABLE(fail_count INT, blocked BOOLEAN, retry_after_sec INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  window_start TIMESTAMPTZ := now() - INTERVAL '10 minutes';
  lockout_window TIMESTAMPTZ := now() - INTERVAL '15 minutes';
  fails_email INT;
  fails_ip INT;
  last_fail_email TIMESTAMPTZ;
  last_fail_ip TIMESTAMPTZ;
  block BOOLEAN := false;
  retry INT := 0;
BEGIN
  SELECT COUNT(*), MAX(created_at) INTO fails_email, last_fail_email
  FROM public.login_attempts
  WHERE email_hash = _email_hash AND success = false AND created_at >= window_start;

  SELECT COUNT(*), MAX(created_at) INTO fails_ip, last_fail_ip
  FROM public.login_attempts
  WHERE ip = _ip AND success = false AND created_at >= window_start;

  -- If 5+ fails in last 10min, block for 15min from the last fail
  IF fails_email >= 5 AND last_fail_email IS NOT NULL THEN
    IF last_fail_email > (now() - INTERVAL '15 minutes') THEN
      block := true;
      retry := GREATEST(retry, CEIL(EXTRACT(EPOCH FROM (last_fail_email + INTERVAL '15 minutes' - now())))::INT);
    END IF;
  END IF;

  IF fails_ip >= 5 AND last_fail_ip IS NOT NULL THEN
    IF last_fail_ip > (now() - INTERVAL '15 minutes') THEN
      block := true;
      retry := GREATEST(retry, CEIL(EXTRACT(EPOCH FROM (last_fail_ip + INTERVAL '15 minutes' - now())))::INT);
    END IF;
  END IF;

  fail_count := GREATEST(fails_email, fails_ip);
  blocked := block;
  retry_after_sec := retry;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_login_attempt(
  _email_hash TEXT,
  _ip TEXT,
  _success BOOLEAN
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.login_attempts(email_hash, ip, success)
  VALUES (_email_hash, _ip, _success);

  -- Best-effort cleanup: keep only last 24h
  DELETE FROM public.login_attempts WHERE created_at < now() - INTERVAL '24 hours';
END;
$$;

REVOKE ALL ON FUNCTION public.check_login_rate_limit(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_login_attempt(TEXT, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_login_rate_limit(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_login_attempt(TEXT, TEXT, BOOLEAN) TO service_role;
