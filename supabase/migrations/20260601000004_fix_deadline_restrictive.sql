-- ════════════════════════════════════════════════════════════
-- 修正:截止鎖定必須是 RESTRICTIVE policy
--
-- Bug:原 orders_before_deadline 為 permissive,而 orders_self_rw
-- (for all)對 insert 的 with check 已成立。多個 permissive policy
-- 之間是 OR,deadline 限制被旁路 → 過了截止仍能下單。
--
-- 修正:改用 restrictive(AND 邏輯),且涵蓋 insert/update/delete,
-- 讓截止後無法新增、改單、取消;select 不限制,歷程仍可讀過去訂單。
-- service_role(seed / admin API)有 BYPASSRLS,不受影響。
-- ════════════════════════════════════════════════════════════

drop policy if exists orders_before_deadline on public.orders;

-- 共用條件:該日期的菜單已過截止
--   not exists(...) = 尚未截止 → 允許
create policy orders_no_insert_past_deadline on public.orders
  as restrictive for insert with check (
    not exists (
      select 1 from public.daily_menus m
      where m.date = orders.date and m.deadline is not null and now() > m.deadline
    )
  );

create policy orders_no_update_past_deadline on public.orders
  as restrictive for update
  using (
    not exists (
      select 1 from public.daily_menus m
      where m.date = orders.date and m.deadline is not null and now() > m.deadline
    )
  )
  with check (
    not exists (
      select 1 from public.daily_menus m
      where m.date = orders.date and m.deadline is not null and now() > m.deadline
    )
  );

create policy orders_no_delete_past_deadline on public.orders
  as restrictive for delete using (
    not exists (
      select 1 from public.daily_menus m
      where m.date = orders.date and m.deadline is not null and now() > m.deadline
    )
  );
