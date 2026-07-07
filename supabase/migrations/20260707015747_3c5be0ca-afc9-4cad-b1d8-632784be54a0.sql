revoke execute on function public.trigger_send_notification() from public, anon, authenticated;
grant execute on function public.trigger_send_notification() to service_role;

create trigger notification_queue_send_after_insert
after insert on public.notification_queue
for each row execute function public.trigger_send_notification();