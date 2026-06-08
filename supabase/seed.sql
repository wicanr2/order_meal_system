-- ════════════════════════════════════════════════════════════
-- 種子資料 (PLAN.md 第 5.3 節) — supabase db reset 會自動套用
-- 提供一個「跟正式環境一樣的測試世界」
-- 註:account_id 由 profiles trigger 從 (工號,姓名) 推導;email 為不可變 opaque 值,
--     此處用 legacy 格式 工號@test.local(與既有雲端資料一致)。
-- ════════════════════════════════════════════════════════════

-- 1 個 admin
insert into profiles (emp_id, name, email, is_admin) values
  ('admin', '系統管理員', 'admin@test.local', true);

-- 5 個一般員工
insert into profiles (emp_id, name, email, department) values
  ('T12345', '王小明', 't12345@test.local', '研發部'),
  ('T12346', '林大華', 't12346@test.local', '研發部'),
  ('T12347', '陳美麗', 't12347@test.local', '業務部'),
  ('T12348', '黃小強', 't12348@test.local', '業務部'),
  ('T12349', '張小英', 't12349@test.local', '行政部');

-- 今日 + 明日菜單
insert into daily_menus (date, restaurant, items, deadline) values
  (current_date, '池上便當', '[
    {"id":"1","name":"排骨便當","price":110},
    {"id":"2","name":"雞腿便當","price":120},
    {"id":"3","name":"魚排便當","price":105}
  ]'::jsonb, current_date + time '10:30'),
  (current_date + 1, '國泰', '[{"id":"default-summer-meal","name":"夏季專案補助餐","price":120}]'::jsonb, null);

-- 幾筆訂單方便看 UI(account_id = 工號|姓名,emp_id/emp_name 為顯示快照)
insert into orders (account_id, emp_id, emp_name, date, item_id, item_name, price) values
  ('T12345|王小明', 'T12345', '王小明', current_date, '2', '雞腿便當', 120),
  ('T12346|林大華', 'T12346', '林大華', current_date, '1', '排骨便當', 110),
  ('T12347|陳美麗', 'T12347', '陳美麗', current_date, '2', '雞腿便當', 120);
