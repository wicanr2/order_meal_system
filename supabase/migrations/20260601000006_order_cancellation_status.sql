-- Keep cancelled orders as history instead of deleting rows.
alter table public.orders
  add column if not exists status text not null default 'active',
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by text,
  add column if not exists cancelled_reason text,
  add column if not exists cancellation_history jsonb not null default '[]'::jsonb;

alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check check (status in ('active', 'cancelled'));

create index if not exists idx_orders_date_status on public.orders(date, status);

create or replace view public.daily_order_summary as
select
  o.date,
  o.item_name,
  count(*) as qty,
  sum(o.price) as subtotal
from public.orders o
where o.status = 'active'
group by o.date, o.item_name;
