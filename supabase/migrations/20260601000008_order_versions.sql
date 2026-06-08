-- Preserve cancelled order rows and allow a new active reservation afterwards.
-- A person can still have only one active order per day.
create extension if not exists pgcrypto;

alter table public.orders
  add column if not exists id uuid default gen_random_uuid();

update public.orders
set id = gen_random_uuid()
where id is null;

alter table public.orders
  alter column id set not null;

alter table public.orders
  drop constraint if exists orders_pkey;

alter table public.orders
  add constraint orders_pkey primary key (id);

create unique index if not exists orders_one_active_per_account_date
  on public.orders(account_id, date)
  where status = 'active';

create index if not exists idx_orders_account_date on public.orders(account_id, date);
