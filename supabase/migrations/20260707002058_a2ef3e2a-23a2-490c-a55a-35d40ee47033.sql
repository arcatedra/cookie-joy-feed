-- Columnas para convertir subscription_orders en paradas
alter table public.subscription_orders
  add column if not exists package_code     text unique,
  add column if not exists delivery_address text,
  add column if not exists delivery_lat     numeric(10,6),
  add column if not exists delivery_lng     numeric(10,6),
  add column if not exists recipient_name   text,
  add column if not exists recipient_phone  text;

-- Un pedido solo puede pertenecer a una ruta en toda su vida
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.route_stops'::regclass
      and conname = 'route_stops_order_id_unique'
  ) then
    alter table public.route_stops
      add constraint route_stops_order_id_unique unique (order_id);
  end if;
end $$;

-- Vista: lotes pendientes de publicar (excluye lo ya asignado a una ruta)
create or replace view public.v_pending_batch_summary
with (security_invoker = true)
as
select
  z.id                             as zone_id,
  z.display_name                   as zone_name,
  so.delivery_day,
  so.dispatch_date,
  count(*)                         as total_orders,
  coalesce(sum(so.weight_kg), 0)   as total_weight_kg
from public.subscription_orders so
join public.delivery_zones z on z.id = so.zone_id
left join public.route_stops rs on rs.order_id = so.id
where so.status = 'confirmado'
  and rs.id is null
group by z.id, z.display_name, so.delivery_day, so.dispatch_date
order by so.dispatch_date, z.display_name;

-- Publicar ruta a partir de un lote
create or replace function public.publish_route(
  p_zone_id       text,
  p_dispatch_date date,
  p_delivery_day  public.dispatch_day,
  p_route_name    text,
  p_fixed_pay     numeric
)
returns public.delivery_routes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_route public.delivery_routes;
  v_count int;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Solo un administrador puede publicar rutas';
  end if;

  select count(*) into v_count
  from public.subscription_orders so
  left join public.route_stops rs on rs.order_id = so.id
  where so.zone_id = p_zone_id
    and so.dispatch_date = p_dispatch_date
    and so.delivery_day = p_delivery_day
    and so.status = 'confirmado'
    and rs.id is null;

  if v_count = 0 then
    raise exception 'No hay pedidos pendientes de publicar para esa zona y fecha';
  end if;

  insert into public.delivery_routes
    (route_name, zone_id, dispatch_date, delivery_day, total_stops, fixed_pay, status)
  values
    (p_route_name, p_zone_id, p_dispatch_date, p_delivery_day, v_count, p_fixed_pay, 'disponible')
  returning * into v_route;

  insert into public.route_stops (
    route_id, order_id, sequence_number, package_code,
    delivery_address, delivery_lat, delivery_lng,
    recipient_name, recipient_phone
  )
  select
    v_route.id,
    so.id,
    row_number() over (order by so.created_at asc),
    coalesce(so.package_code, 'HZX-' || upper(substr(replace(so.id::text, '-', ''), 1, 8))),
    coalesce(so.delivery_address, ''),
    so.delivery_lat,
    so.delivery_lng,
    coalesce(so.recipient_name, ''),
    so.recipient_phone
  from public.subscription_orders so
  left join public.route_stops rs on rs.order_id = so.id
  where so.zone_id = p_zone_id
    and so.dispatch_date = p_dispatch_date
    and so.delivery_day = p_delivery_day
    and so.status = 'confirmado'
    and rs.id is null;

  return v_route;
end;
$$;

-- Reordenar una parada
create or replace function public.reorder_route_stop(p_stop_id uuid, p_new_sequence int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Solo un administrador puede reordenar paradas';
  end if;

  update public.route_stops
  set sequence_number = p_new_sequence
  where id = p_stop_id;
end;
$$;

-- RLS (no-op si ya está)
alter table public.subscription_orders enable row level security;