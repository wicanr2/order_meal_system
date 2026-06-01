-- ════════════════════════════════════════════════════════════
-- M3 Auth:Custom Access Token Hook + RLS 修正
--
-- (1) Hook 把登入者的 emp_id / is_admin 注入 JWT claims,
--     RLS policy 才能用 auth.jwt() ->> 'emp_id' 取得身分。
-- (2) 修正原 RLS 的遞迴問題:admin 判斷改用 JWT 的 is_admin claim,
--     不再在 profiles policy 內 select profiles(會無限遞迴)。
-- ════════════════════════════════════════════════════════════

-- ── Custom Access Token Hook ──
-- 依 user_id 找到 email,對應 profiles,注入 emp_id + is_admin
-- security definer:以 owner(postgres)執行,繞過 profiles 的 RLS。
-- (GoTrue 用 supabase_auth_admin 呼叫,該角色不繞 RLS,否則查 profiles 會回 0 列)
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  claims    jsonb;
  v_emp_id  text;
  v_admin   boolean;
begin
  select p.emp_id, p.is_admin
    into v_emp_id, v_admin
  from public.profiles p
  where p.email = (select u.email from auth.users u where u.id = (event->>'user_id')::uuid);

  claims := coalesce(event->'claims', '{}'::jsonb);

  if v_emp_id is not null then
    claims := jsonb_set(claims, '{emp_id}',   to_jsonb(v_emp_id));
    claims := jsonb_set(claims, '{is_admin}', to_jsonb(coalesce(v_admin, false)));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- GoTrue 以 supabase_auth_admin 角色執行 hook
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
grant usage  on schema public                              to supabase_auth_admin;
grant select on public.profiles                            to supabase_auth_admin;

-- ── RLS 修正:用 is_admin claim,避免遞迴 ──
drop policy if exists profiles_self_or_admin on public.profiles;
drop policy if exists menus_write_admin      on public.daily_menus;
drop policy if exists orders_admin_read       on public.orders;

-- Profile:自己看自己;admin (claim) 看全部
create policy profiles_self_or_admin on public.profiles for select using (
  emp_id = (auth.jwt() ->> 'emp_id')
  or coalesce((auth.jwt() ->> 'is_admin')::boolean, false)
);

-- 菜單寫入:僅 admin (claim)
create policy menus_write_admin on public.daily_menus for all using (
  coalesce((auth.jwt() ->> 'is_admin')::boolean, false)
);

-- 訂單:admin (claim) 全可讀
create policy orders_admin_read on public.orders for select using (
  coalesce((auth.jwt() ->> 'is_admin')::boolean, false)
);
