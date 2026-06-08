-- Employees cannot create, modify, or cancel orders for past dates.
-- Admin/service-role operations bypass RLS and can still correct history.
drop policy if exists orders_no_insert_past_deadline on public.orders;
drop policy if exists orders_no_update_past_deadline on public.orders;
drop policy if exists orders_no_delete_past_deadline on public.orders;

create policy orders_no_insert_past_deadline on public.orders
  as restrictive for insert with check (
    orders.date >= current_date
    and not exists (
      select 1 from public.daily_menus m
      where m.date = orders.date and m.deadline is not null and now() > m.deadline
    )
  );

create policy orders_no_update_past_deadline on public.orders
  as restrictive for update
  using (
    orders.date >= current_date
    and not exists (
      select 1 from public.daily_menus m
      where m.date = orders.date and m.deadline is not null and now() > m.deadline
    )
  )
  with check (
    orders.date >= current_date
    and not exists (
      select 1 from public.daily_menus m
      where m.date = orders.date and m.deadline is not null and now() > m.deadline
    )
  );

create policy orders_no_delete_past_deadline on public.orders
  as restrictive for delete using (
    orders.date >= current_date
    and not exists (
      select 1 from public.daily_menus m
      where m.date = orders.date and m.deadline is not null and now() > m.deadline
    )
  );
