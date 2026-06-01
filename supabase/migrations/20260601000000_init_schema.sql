-- ════════════════════════════════════════════════════════════
-- 便當訂購系統 — 初始 schema
-- 對應 PLAN.md 第 3.1 節,對齊現有 訂餐app.tsx 資料結構
-- ════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- 員工檔案 (Profile)
-- ─────────────────────────────────────────────
create table profiles (
  emp_id      text primary key,            -- 對應現有 userInfo.empId
  name        text not null,               -- 對應現有 userInfo.name
  department  text,                         -- 新增,給統計用
  is_admin    boolean default false,        -- 取代寫死的 ADMIN_IDS
  email       text unique,                  -- Supabase Auth 連結用
  active      boolean default true,         -- 離職員工不刪資料,改 false
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 每日菜單 (DailyMenu) — date 當主鍵 = 一天一份
-- ─────────────────────────────────────────────
create table daily_menus (
  date         date primary key,
  restaurant   text not null,
  items        jsonb not null,              -- [{id, name, price}]
  deadline     timestamptz,                 -- 點餐截止時間,過了就鎖
  is_default   boolean default false,       -- 是否為預設菜單 (夏季專案)
  updated_by   text references profiles(emp_id),
  updated_at   timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 訂單 (Order) — emp_id + date 唯一,等同現有 orderId
-- ─────────────────────────────────────────────
create table orders (
  emp_id       text references profiles(emp_id),
  date         date not null,
  item_id      text not null,               -- 對應 menu items[].id
  item_name    text not null,               -- 冗餘儲存,菜單改動不影響歷史單
  price        integer not null,            -- 冗餘儲存,同上
  note         text,                         -- 備註 (辣度、忌口等),選用
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  primary key (emp_id, date)
);

create index idx_orders_date on orders(date);
create index idx_orders_emp on orders(emp_id);

-- ─────────────────────────────────────────────
-- 預設菜單常駐 (取代寫死的 DEFAULT_MENU)
-- ─────────────────────────────────────────────
create table default_menu_config (
  id           text primary key default 'default',
  restaurant   text not null,
  items        jsonb not null,
  active_from  date,
  active_to    date,
  updated_at   timestamptz default now()
);

insert into default_menu_config (id, restaurant, items)
values ('default', '國泰', '[{"id":"default-summer-meal","name":"夏季專案補助餐","price":120}]'::jsonb);

-- ─────────────────────────────────────────────
-- View:當日訂單彙總 (給 admin 報表用)
-- ─────────────────────────────────────────────
create view daily_order_summary as
select
  o.date,
  o.item_name,
  count(*) as qty,
  sum(o.price) as subtotal
from orders o
group by o.date, o.item_name;
