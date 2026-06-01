-- ════════════════════════════════════════════════════════════
-- Row Level Security — 零信任前端 (PLAN.md 第 3.2 節)
--
-- ⚠️ 前置依賴 (M3 Auth 才會完整生效):
--   下列 policy 用 auth.jwt() ->> 'emp_id' 取得登入者工號。
--   Supabase 預設 JWT 不含 emp_id claim,需在 M3 加一個
--   Custom Access Token Hook,把 profiles.emp_id 注入 JWT。
--   在 M1/M2 (本機、尚未接 Auth) 階段,policy 已 enable 但
--   會因 jwt 無 emp_id 而拒絕一般 anon 存取 — 這是預期行為,
--   本機驗證請用 service_role key (繞過 RLS) 或 SQL Editor。
-- ════════════════════════════════════════════════════════════

alter table profiles      enable row level security;
alter table daily_menus   enable row level security;
alter table orders        enable row level security;

-- ── Profile:自己看自己;admin 看全部 ──
create policy profiles_self_or_admin on profiles for select using (
  emp_id = (auth.jwt() ->> 'emp_id')
  or exists (
    select 1 from profiles p
    where p.emp_id = (auth.jwt() ->> 'emp_id') and p.is_admin
  )
);

-- ── 菜單:所有登入者可讀 ──
create policy menus_read_all on daily_menus for select using (
  auth.uid() is not null
);

-- ── 菜單寫入:僅 admin ──
create policy menus_write_admin on daily_menus for all using (
  exists (
    select 1 from profiles p
    where p.emp_id = (auth.jwt() ->> 'emp_id') and p.is_admin
  )
);

-- ── 訂單:自己的可讀可寫 ──
create policy orders_self_rw on orders for all using (
  emp_id = (auth.jwt() ->> 'emp_id')
);

-- ── 訂單:admin 全可讀 ──
create policy orders_admin_read on orders for select using (
  exists (
    select 1 from profiles p
    where p.emp_id = (auth.jwt() ->> 'emp_id') and p.is_admin
  )
);

-- ── 截止時間檢查:過了 deadline 不能新增訂單 ──
create policy orders_before_deadline on orders for insert with check (
  not exists (
    select 1 from daily_menus m
    where m.date = orders.date
      and m.deadline is not null
      and now() > m.deadline
  )
);
