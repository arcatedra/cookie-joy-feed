create or replace function public.trigger_send_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_function_url text;
  v_webhook_secret text;
begin
  select value into v_function_url
  from public.internal_hook_config
  where key = 'notify_order_url';

  select value into v_webhook_secret
  from public.internal_hook_config
  where key = 'notify_order_secret';

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

insert into public.internal_hook_config (key, value) values
  ('notify_order_url', 'https://project--d99974e1-204d-46a0-816a-e2595eaf444a.lovable.app/api/public/hooks/notify-order'),
  ('notify_order_secret', encode(gen_random_bytes(32), 'hex'))
on conflict (key) do nothing;