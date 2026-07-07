alter table public.notification_queue
  add column if not exists processed_at timestamptz,
  add column if not exists attempts int not null default 0,
  add column if not exists last_error text;

create extension if not exists pg_net;

create or replace function public.trigger_send_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_function_url text := current_setting('app.settings.notify_function_url', true);
  v_webhook_secret text := current_setting('app.settings.notify_webhook_secret', true);
begin
  if v_function_url is null or v_function_url = '' then
    return new;
  end if;

  perform net.http_post(
    url := v_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', coalesce(v_webhook_secret, '')
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'notification_queue',
      'record', to_jsonb(new)
    )
  );
  return new;
end;
$$;