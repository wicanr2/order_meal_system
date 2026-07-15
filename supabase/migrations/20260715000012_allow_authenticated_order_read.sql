-- Let every signed-in user see the day's order records, while keeping writes
-- restricted by the existing self-only and deadline policies.
drop policy if exists orders_authenticated_read on public.orders;

create policy orders_authenticated_read on public.orders
  for select
  using (auth.uid() is not null);
