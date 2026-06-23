
DO $$
DECLARE
  jid bigint;
  secret text;
BEGIN
  -- Drop any existing backup cron job(s) regardless of previous name
  FOR jid IN
    SELECT jobid FROM cron.job
    WHERE command ILIKE '%/api/public/hooks/backup-csv%'
       OR jobname IN ('backup-csv-daily', 'backup-csv-daily-secure', 'daily-backup-csv')
  LOOP
    PERFORM cron.unschedule(jid);
  END LOOP;

  SELECT value INTO secret FROM public.internal_hook_config WHERE key = 'backup_hook_secret';
  IF secret IS NULL OR length(secret) = 0 THEN
    RAISE EXCEPTION 'backup_hook_secret not configured in internal_hook_config';
  END IF;

  PERFORM cron.schedule(
    'backup-csv-daily-secure',
    '30 7 * * *',
    format($cron$
      SELECT net.http_post(
        url := 'https://project--d99974e1-204d-46a0-816a-e2595eaf444a.lovable.app/api/public/hooks/backup-csv',
        headers := %L::jsonb,
        body := '{}'::jsonb
      );
    $cron$, jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret)::text)
  );
END $$;
