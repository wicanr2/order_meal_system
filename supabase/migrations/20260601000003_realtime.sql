-- 讓 orders 表的變動可被 Realtime 推播(admin 即時看到新訂單)
alter publication supabase_realtime add table public.orders;
