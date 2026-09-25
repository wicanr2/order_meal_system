-- 全部訂單明細匯出(spec docs/specs/0001-export-all-orders-csv.md)。
-- 單一查詢同時回傳 rows 與 total:同一 snapshot,且回傳單一 jsonb 值不受 PostgREST max_rows 截斷。
-- 時間在 DB 端以 Asia/Taipei 格式化,避免依賴 server 執行環境時區。
create or replace function public.export_orders(p_status text)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'total', count(*),
    'rows', coalesce(jsonb_agg(jsonb_build_array(
        o.date::text,
        coalesce(m.restaurant, d.restaurant, ''),
        o.order_serial,
        o.emp_id,
        o.emp_name,
        o.item_name,
        o.price,
        o.status,
        to_char(o.created_at   at time zone 'Asia/Taipei', 'YYYY-MM-DD HH24:MI:SS'),
        to_char(o.cancelled_at at time zone 'Asia/Taipei', 'YYYY-MM-DD HH24:MI:SS'),
        o.cancelled_by
      ) order by o.date, o.created_at, o.id), '[]'::jsonb)
  )
  from public.orders o
  left join public.daily_menus m on m.date = o.date
  left join public.default_menu_config d on d.id = 'default'
  where p_status = 'all' or o.status = p_status;
$$;

-- 新建函式預設 PUBLIC 可執行,需明確收回;只給 server 端 service-role 呼叫。
revoke all on function public.export_orders(text) from public, anon, authenticated;
grant execute on function public.export_orders(text) to service_role;
