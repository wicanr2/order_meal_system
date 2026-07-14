-- Give every order a stable serial number based on order time and per-date sequence.
alter table public.orders
  add column if not exists order_sequence integer,
  add column if not exists order_serial text;

with ranked as (
  select
    id,
    row_number() over (
      partition by (coalesce(created_at, now()) at time zone 'Asia/Taipei')::date
      order by created_at nulls last, id
    ) as seq
  from public.orders
)
update public.orders o
set
  order_sequence = ranked.seq,
  order_serial = to_char(coalesce(o.created_at, now()) at time zone 'Asia/Taipei', 'YYYYMMDDHH24MISS')
    || '-' || lpad(ranked.seq::text, 4, '0')
from ranked
where o.id = ranked.id
  and (o.order_sequence is null or o.order_serial is null);

alter table public.orders
  alter column order_sequence set not null,
  alter column order_serial set not null;

create unique index if not exists orders_order_day_sequence_key
  on public.orders(((created_at at time zone 'Asia/Taipei')::date), order_sequence);

create unique index if not exists idx_orders_order_serial
  on public.orders(order_serial);

create or replace function public.assign_order_serial()
returns trigger
language plpgsql
as $$
declare
  next_sequence integer;
begin
  if new.created_at is null then
    new.created_at := now();
  end if;

  if new.order_sequence is null then
    perform pg_advisory_xact_lock(hashtext('orders:' || ((new.created_at at time zone 'Asia/Taipei')::date)::text));

    select coalesce(max(order_sequence), 0) + 1
      into next_sequence
      from public.orders
      where (created_at at time zone 'Asia/Taipei')::date = (new.created_at at time zone 'Asia/Taipei')::date;

    new.order_sequence := next_sequence;
  end if;

  if new.order_serial is null then
    new.order_serial := to_char(new.created_at at time zone 'Asia/Taipei', 'YYYYMMDDHH24MISS')
      || '-' || lpad(new.order_sequence::text, 4, '0');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_assign_order_serial on public.orders;
create trigger trg_assign_order_serial
  before insert on public.orders
  for each row execute function public.assign_order_serial();
