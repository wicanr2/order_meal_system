-- ════════════════════════════════════════════════════════════
-- M5:身分鍵改為「工號 + 姓名」複合帳號 (account_id)
--
-- 動機:登入時若 (工號, 姓名) 不在資料庫 → 自動建立並允許登入;
--      工號相同但姓名不同 = 視為一組獨立帳號(獨立訂單與歷程)。
--      因此身分鍵不能再是單一 emp_id(原為 profiles PK)。
--
-- 設計(無痕原則,本機與雲端走同一條路):
--   * account_id = emp_id || '|' || name,由 trigger 推導(新欄,純加法)。
--   * email 為「不可變的 opaque 值」,trigger 不碰;既有 auth↔profile 的
--     email 對應因此完全不受影響(雲端現有使用者不會被鎖出)。
--   * 登入不靠公式推 email,而是用 (工號,姓名) 查 profile 取回其既存 email
--     (見 /api/auth/ensure);新帳號才於建立時挑一個唯一 email。
-- ════════════════════════════════════════════════════════════

-- ── 1) 解除舊外鍵 / 主鍵(orders、daily_menus 都掛在 profiles.emp_id 上) ──
alter table orders      drop constraint if exists orders_emp_id_fkey;
alter table daily_menus drop constraint if exists daily_menus_updated_by_fkey;
alter table profiles    drop constraint if exists profiles_pkey;

-- ── 2) profiles:新增 account_id,改為主鍵 ──
alter table profiles add column if not exists account_id text;
update profiles set account_id = emp_id || '|' || name where account_id is null;
alter table profiles alter column account_id set not null;
alter table profiles add constraint profiles_pkey primary key (account_id);
-- emp_id 不再唯一(同工號可有多筆不同姓名),但仍為必填顯示欄
alter table profiles alter column emp_id set not null;

-- ── 3) trigger:account_id 一律由 (emp_id, name) 推導(email 不碰,維持 opaque) ──
-- 純資料一致性:讓 seed / 各 script / app 都不必自行算 account_id;
-- 改名時 account_id 隨之變動,orders 經 FK on update cascade 跟著搬。
create or replace function public.profiles_derive_keys()
returns trigger
language plpgsql
as $$
begin
  new.emp_id := trim(new.emp_id);
  new.name   := trim(new.name);
  new.account_id := new.emp_id || '|' || new.name;
  return new;
end;
$$;

drop trigger if exists trg_profiles_derive_keys on profiles;
create trigger trg_profiles_derive_keys
  before insert or update on profiles
  for each row execute function public.profiles_derive_keys();

-- ── 4) orders:擁有鍵改 account_id,emp_id/emp_name 降為顯示快照 ──
alter table orders add column if not exists account_id text;
alter table orders add column if not exists emp_name   text;
update orders o set
  account_id = o.emp_id || '|' || coalesce((select p.name from profiles p where p.emp_id = o.emp_id limit 1), ''),
  emp_name   = (select p.name from profiles p where p.emp_id = o.emp_id limit 1)
where o.account_id is null;
alter table orders alter column account_id set not null;
alter table orders drop constraint if exists orders_pkey;
alter table orders add constraint orders_pkey primary key (account_id, date);
alter table orders add constraint orders_account_fk
  foreign key (account_id) references profiles(account_id)
  on update cascade on delete cascade;

-- ── 5) RLS 重設(改用 acct claim) ──
drop policy if exists profiles_self_or_admin on profiles;
create policy profiles_self_or_admin on profiles for select using (
  account_id = (auth.jwt() ->> 'acct')
  or coalesce((auth.jwt() ->> 'is_admin')::boolean, false)
);

drop policy if exists orders_self_rw on orders;
create policy orders_self_rw on orders for all using (
  account_id = (auth.jwt() ->> 'acct')
);
-- orders_admin_read / menus_write_admin / menus_read_all / 截止 restrictive 政策不變

-- ── 6) Auth hook 重建:注入 acct + name(沿用 email → profile 對應) ──
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  claims    jsonb;
  v_acct    text;
  v_emp_id  text;
  v_name    text;
  v_admin   boolean;
begin
  select p.account_id, p.emp_id, p.name, p.is_admin
    into v_acct, v_emp_id, v_name, v_admin
  from public.profiles p
  where p.email = (select u.email from auth.users u where u.id = (event->>'user_id')::uuid);

  claims := coalesce(event->'claims', '{}'::jsonb);

  if v_acct is not null then
    claims := jsonb_set(claims, '{acct}',     to_jsonb(v_acct));
    claims := jsonb_set(claims, '{emp_id}',   to_jsonb(v_emp_id));
    claims := jsonb_set(claims, '{name}',     to_jsonb(v_name));
    claims := jsonb_set(claims, '{is_admin}', to_jsonb(coalesce(v_admin, false)));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant execute on function public.custom_access_token_hook to supabase_auth_admin;
