# 便當訂購系統 — Local 開發到雲端部署 Plan

> 從現有的 React 原型(localStorage 版)演進為可上雲、可協作、可備份的多人系統
> 目標讀者:robotics 工程背景、熟 Python/Go,前端 React 經驗中等

---

## 0. TL;DR(一頁總覽)

**現狀**:單檔 React (`訂餐app.tsx`, 657 行),所有資料存在 localStorage,每個人瀏覽器各自一份,管理員看不到員工的訂單。

**最終目標**:Next.js + Supabase(Postgres + Auth + RLS),Vercel 部署,$0/月 起跳,公司內部 < 500 人都在免費額度。

**驗證策略**:三階段 — Local Docker 完整模擬 → Staging Supabase 真實串接 → Production Vercel 公開。每階段都有明確的 acceptance criteria,過了才往下走。

**開發協作**:Claude Code (CLI) 跑 dynamic workflow,定義五個 sub-agent(architect / coder / reviewer / tester / migrator),每個 milestone 啟動對應 agent 自動執行 + 自動驗證。Opus 4.7 暫時不能跑,先用 Sonnet 4.6 或 Haiku 4.5 過渡,workflow 設計成「換 model 不用改 prompt」。

---

## 1. 現況分析

### 1.1 既有功能盤點

| 模組 | 完成度 | 備註 |
|---|---|---|
| 工號 + 姓名登入 | ✅ | 無密碼、無驗證,僅 localStorage 寫入 |
| Admin 白名單(`['admin', 'ADMIN', 'admin888']`) | ⚠️ | 寫死在前端,任何人輸入 `admin` 即取得管理權 |
| 預設菜單(國泰夏季專案 $120) | ✅ | 寫死在 `DEFAULT_MENU` |
| 自訂菜單(每日 restaurant + items[]) | ✅ | 存 `meal_app_menus[date]` |
| 員工點餐 / 取消 / 改點 | ✅ | 一人一日一單,用 `empId_date` 當主鍵 |
| 角色切換(管理員可切員工視角) | ✅ | `viewRole` state |
| 訂單統計(品項彙總 + 人員明細) | ✅ | 純前端 reduce |
| CSV 匯出(UTF-8 BOM, Excel 友善) | ✅ | 純前端 Blob download |
| 日期切換瀏覽 | ✅ | 可看歷史 / 未來 |

### 1.2 上雲必須解決的問題(按優先級)

**P0 — 阻塞性**
1. **資料不共享**:localStorage 是 per-browser per-origin,管理員看不到員工的訂單。這是整個系統最根本的問題。
2. **沒有真正的身分驗證**:工號 `admin` 任何人都能輸入,直接取得管理權。

**P1 — 強烈建議**
3. **沒有截止時間鎖定**:過了 10:30 還能訂,菜單變動沒有同步給已下單的人。
4. **沒有資料備份**:清快取就消失。
5. **管理員白名單寫死在前端**:換管理員要改 code 重 deploy。

**P2 — Nice to have**
6. **沒有 LINE / Email 通知**(今日菜單、訂單截止提醒)
7. **沒有歷史統計**(每月個人 / 部門 / 餐廳消費)
8. **沒有部門欄位**(無法做部門報表)

### 1.3 規模假設(請確認)

- 使用人數:**約 50–200 人**(單一公司)
- 日訂單量:**< 200 筆/日**
- 同時上線:**< 50 人**(午餐前的 10 分鐘高峰)
- 資料量:每年 < 10 MB
- 多公司 / SaaS:**目前不考慮**(若要,架構需加 tenant 隔離)

→ 結論:**Supabase 免費方案綽綽有餘**(500 MB DB, 50,000 MAU)。

---

## 2. 目標架構

### 2.1 雲端架構圖

```
       使用者瀏覽器(公司網路)
             ↓ HTTPS
       ┌─────────────────┐
       │     Vercel      │  Next.js 14 (App Router)
       │   (前端 + API)   │  Server Actions, Edge Functions
       └────────┬────────┘
                ↓ Supabase JS SDK
       ┌─────────────────┐
       │    Supabase     │  ┌─ Postgres (RLS-protected)
       │ (DB+Auth+Storage)│  ├─ Auth (Email/OAuth/Magic Link)
       │                 │  └─ Storage (菜單圖片,選用)
       └─────────────────┘
                ↑
       (Optional) Vercel Cron → LINE Messaging API → 員工 LINE
```

### 2.2 技術棧選擇理由

| 元件 | 選擇 | 替代方案 | 為什麼選這個 |
|---|---|---|---|
| 前端框架 | **Next.js 14 App Router** | Vite + React Router | Vercel 原生、SSR、Server Actions 省 API code |
| UI 元件 | shadcn/ui + Tailwind | MUI / Ant Design | 你現有 code 已經用 Tailwind,複製貼上即可 |
| 資料庫 | **Supabase (Postgres)** | Firebase / PlanetScale | 開源、SQL、RLS 直接做權限、本地可 docker 跑 |
| Auth | **Supabase Auth** | Clerk / NextAuth | 跟 DB 同一家,RLS 連動,有免費 OAuth |
| 部署 | **Vercel** | Cloudflare Pages / 自架 | 連 GitHub 自動 deploy、Edge Network、預覽環境 |
| 通知(選用) | LINE Messaging API | Email (SendGrid) | 台灣公司用 LINE 比 email 觸及率高 |

### 2.3 為什麼不用 X?

- **不用 Firebase**:NoSQL 對「報表/統計」不直觀,要寫一堆 cloud function。
- **不用自架 VPS**:單機要自己管 SSL、備份、log、監控,維護成本高於免費 SaaS。
- **不用 AWS Amplify**:設定複雜,小專案殺雞用牛刀。
- **不用 Next.js 全自架(K8s)**:你這規模絕對用不到。

---

## 3. 資料模型設計

### 3.1 Schema(對應現有 code 結構)

```sql
-- ─────────────────────────────────────────────
-- 員工檔案
-- ─────────────────────────────────────────────
create table profiles (
  emp_id      text primary key,            -- 對應現有 userInfo.empId
  name        text not null,               -- 對應現有 userInfo.name
  department  text,                        -- 新增,給統計用
  is_admin    boolean default false,       -- 取代寫死的 ADMIN_IDS
  email       text unique,                 -- Supabase Auth 連結用
  active      boolean default true,        -- 離職員工不刪資料,改 false
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 每日菜單(date 當主鍵 = 一天一份)
-- ─────────────────────────────────────────────
create table daily_menus (
  date         date primary key,
  restaurant   text not null,
  items        jsonb not null,             -- [{id, name, price}]
  deadline     timestamptz,                -- 點餐截止時間,過了就鎖
  is_default   boolean default false,      -- 是否為預設菜單(夏季專案)
  updated_by   text references profiles(emp_id),
  updated_at   timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 訂單(emp_id + date 唯一,等同現有 orderId)
-- ─────────────────────────────────────────────
create table orders (
  emp_id       text references profiles(emp_id),
  date         date not null,
  item_id      text not null,              -- 對應 menu items[].id
  item_name    text not null,              -- 冗餘儲存,菜單改動不影響歷史單
  price        integer not null,           -- 冗餘儲存,同上
  note         text,                       -- 備註(辣度、忌口等),選用
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  primary key (emp_id, date)
);

create index idx_orders_date on orders(date);
create index idx_orders_emp on orders(emp_id);

-- ─────────────────────────────────────────────
-- 預設菜單常駐(取代寫死的 DEFAULT_MENU)
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
-- View:當日訂單彙總(給 admin 報表用)
-- ─────────────────────────────────────────────
create view daily_order_summary as
select
  o.date,
  o.item_name,
  count(*) as qty,
  sum(o.price) as subtotal
from orders o
group by o.date, o.item_name;
```

### 3.2 Row Level Security(權限一次鎖死)

```sql
alter table profiles enable row level security;
alter table daily_menus enable row level security;
alter table orders enable row level security;

-- 自己看自己的 profile;admin 看全部
create policy profiles_self_or_admin on profiles for select using (
  emp_id = (auth.jwt() ->> 'emp_id')
  or exists (select 1 from profiles where emp_id = (auth.jwt() ->> 'emp_id') and is_admin)
);

-- 菜單:所有登入者可讀
create policy menus_read_all on daily_menus for select using (auth.uid() is not null);
-- 菜單寫入:僅 admin
create policy menus_write_admin on daily_menus for all using (
  exists (select 1 from profiles where emp_id = (auth.jwt() ->> 'emp_id') and is_admin)
);

-- 訂單:自己的可讀可寫;admin 全可讀
create policy orders_self_rw on orders for all using (emp_id = (auth.jwt() ->> 'emp_id'));
create policy orders_admin_read on orders for select using (
  exists (select 1 from profiles where emp_id = (auth.jwt() ->> 'emp_id') and is_admin)
);

-- 截止時間檢查(新增/修改訂單時)
create policy orders_before_deadline on orders for insert with check (
  not exists (
    select 1 from daily_menus m
    where m.date = orders.date and m.deadline is not null and now() > m.deadline
  )
);
```

→ **重點**:這套 policy 寫完,前端就算被 hack 直接呼叫 supabase-js,也只能存取自己的資料。零信任前端。

---

## 4. 開發階段規劃

### 4.1 三個環境

| 環境 | 資料庫 | 用途 | 部署 |
|---|---|---|---|
| **Local** | Docker Compose 跑 Supabase + Postgres | 你的開發機驗證 | `npm run dev` |
| **Staging** | Supabase Cloud 免費專案(branch: staging) | 給同事試用、UAT | Vercel Preview |
| **Production** | Supabase Cloud 免費專案(branch: main) | 正式上線 | Vercel Production |

Supabase 支援 **Database Branching**(類似 git branch),staging 改 schema 不影響 production,確認 OK 再 merge。

### 4.2 Milestone 拆解(每個 milestone 都可獨立驗收)

#### **M1 — Local Supabase + Schema 建立**(預估 0.5 天)

**目標**:本機跑起 Supabase,建好上面所有資料表跟 RLS policy。

**步驟**:
```bash
# 1. 安裝 Supabase CLI
brew install supabase/tap/supabase  # mac
# 或 npm install -g supabase

# 2. 初始化專案
mkdir bento-app && cd bento-app
supabase init

# 3. 啟動 local stack(會起 Postgres + Auth + Studio + Storage)
supabase start
# 跑完會印出 API URL / anon key / service_role key / Studio URL

# 4. 寫 migration
supabase migration new init_schema
# 把上面的 SQL 貼進 supabase/migrations/<timestamp>_init_schema.sql

# 5. 套用
supabase db reset
```

**驗收條件**:
- [ ] `http://localhost:54323` 打得開 Supabase Studio
- [ ] Studio 看得到 `profiles` / `daily_menus` / `orders` 三張表
- [ ] 手動塞一筆 admin profile + 一筆 menu,SQL Editor 跑 `select` 看得到
- [ ] RLS policy 在 Authentication → Policies 全部 enabled

#### **M2 — Next.js 骨架 + Supabase 連線**(預估 0.5 天)

**目標**:Next.js 專案能讀本機 Supabase 的資料。

**步驟**:
```bash
npx create-next-app@latest bento-frontend --typescript --tailwind --app
cd bento-frontend
npm install @supabase/supabase-js @supabase/ssr lucide-react
npx shadcn@latest init
```

建立 `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<從 supabase start 輸出複製>
```

寫一個 `/app/test/page.tsx` 顯示資料庫的 profiles 列表,驗證連線通。

**驗收條件**:
- [ ] `npm run dev` 起得來,`http://localhost:3000/test` 顯示資料
- [ ] 改 Supabase Studio 裡的資料,前端重新整理就更新

#### **M3 — Auth 整合(取代工號+姓名登入)**(預估 1 天)

**設計選擇**:給三個選項,看公司情況決定。

| 選項 | 適用 | 工作量 |
|---|---|---|
| **A. Email + Magic Link** | 公司沒有 SSO,但每人有公司 email | 最低,Supabase 內建 |
| **B. Google OAuth** | 公司用 Google Workspace | 低,Supabase 內建 |
| **C. 工號 + 密碼**(沿用現有 UX) | 公司沒 email、IT 不想架 SSO | 中,要寫 custom auth |

**建議**:**B**。新員工到職同步建 profile(可用 Supabase trigger),登入過了就有資料,zero touch onboarding。

**保留現有 UX 的妥協方案**:工號當 email prefix(`T12345@company-internal.local`),密碼用 Supabase 管理。登入頁 UI 不用大改,只是底層換成 supabase.auth.signInWithPassword。

**驗收條件**:
- [ ] 沒登入時自動跳轉登入頁
- [ ] 登入後 `auth.users` 表有資料,`profiles` 對應有資料
- [ ] 登入後 cookie / session 持久化(關瀏覽器重開還在)
- [ ] 登出按鈕真的清掉 session

#### **M4 — 核心功能遷移(localStorage → Supabase)**(預估 1.5 天)

把現有的四個 localStorage 操作改成 Supabase 呼叫。逐步替換,每換一個就 commit。

| 原本 | 改為 |
|---|---|
| `localStorage.setItem('meal_app_menus', ...)` | `await supabase.from('daily_menus').upsert(...)` |
| `localStorage.getItem('meal_app_menus')` | `useEffect + supabase.from('daily_menus').select()` |
| `localStorage.setItem('meal_app_orders', ...)` | `await supabase.from('orders').upsert(...)` |
| `localStorage.getItem('meal_app_orders')` | `useEffect + supabase.from('orders').select()` |

**進階**:加 **Realtime subscription**,讓 admin 頁面在有人下單時即時更新,不用 F5。

```typescript
useEffect(() => {
  const channel = supabase
    .channel('orders-today')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'orders', filter: `date=eq.${currentDate}` },
      (payload) => { /* 更新 state */ })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [currentDate]);
```

**驗收條件**:
- [ ] A 員工下單,B 管理員的頁面 1 秒內看到(不用重整)
- [ ] 切換日期會載入該日資料,不是混到全部
- [ ] 預設菜單從 DB 讀,不是寫死
- [ ] CSV 匯出仍然正常(本來就純前端,不會壞)

#### **M5 — 截止時間 + 部門 + 通知(P1/P2)**(預估 1 天)

- 菜單加 `deadline` 欄位,過了 deadline 點餐按鈕 disabled
- profile 加 `department`,訂單統計加部門分組
- (選用)Vercel Cron 每天 10:00 透過 LINE Messaging API 廣播今日菜單

#### **M6 — Staging 上雲 + UAT**(預估 0.5 天)

- 在 [supabase.com](https://supabase.com) 開免費專案(staging branch)
- migration 推上去:`supabase link --project-ref <ref> && supabase db push`
- 推 GitHub,Vercel 連 repo,branch=staging 自動 deploy 到 preview URL
- 找 3–5 個同事 dogfood 一週

**驗收條件**:
- [ ] 同事用手機 / 公司網路都能開
- [ ] 至少跑過 10 筆真實訂單沒有 bug
- [ ] admin 報表跟同事自己算的金額對得起來

#### **M7 — Production 上線**(預估 0.5 天)

- 開正式的 Supabase 專案
- migration push
- Vercel 綁正式網域 `bento.yourcompany.com`
- 從 staging 匯入種子資料(員工 profile)
- 公告上線

**累計時間**:**約 5–6 個工作天**(認真做),或一個輕鬆的兩週。

---

## 5. Local 測試驗證策略

### 5.1 三層測試

| 層級 | 工具 | 跑什麼 | 何時跑 |
|---|---|---|---|
| **Unit** | Vitest | 純函數:CSV 格式化、日期工具、價格計算 | 每次 commit pre-hook |
| **Integration** | Vitest + supabase-js + local Supabase | 「下單後查詢應該看到」這類跨層流程 | PR CI |
| **E2E** | Playwright | 整套 UI flow:登入 → 下單 → admin 看到 | 每個 milestone 收尾 |

### 5.2 本機完整模擬環境

`docker-compose.yml`(額外的 LINE mock,可選):
```yaml
services:
  # supabase 已經有自己的 docker-compose 不用重寫
  line-mock:
    image: mockserver/mockserver
    ports: ["1080:1080"]
    environment:
      MOCKSERVER_INITIALIZATION_JSON_PATH: /config/line-api-expectations.json
    volumes:
      - ./mocks:/config
```

### 5.3 種子資料(seed.sql)

```sql
-- 1 個 admin
insert into profiles (emp_id, name, email, is_admin) values
  ('admin001', '系統管理員', 'admin@test.local', true);

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

-- 幾筆訂單方便看 UI
insert into orders (emp_id, date, item_id, item_name, price) values
  ('T12345', current_date, '2', '雞腿便當', 120),
  ('T12346', current_date, '1', '排骨便當', 110),
  ('T12347', current_date, '2', '雞腿便當', 120);
```

`supabase db reset` 會自動跑這個 seed,你就有了一個「跟正式環境一樣的測試世界」。

### 5.4 驗證 Checklist(每個 milestone 過了才 merge)

每個 milestone 都該對應一份驗收清單,M4 範例:

```markdown
## M4 驗收清單

### 員工流程
- [ ] 員工 T12345 登入,看到當日菜單(池上便當)
- [ ] T12345 點「雞腿便當」,訊息提示成功
- [ ] 重整頁面,訂單仍在(從 DB 讀,不是 localStorage)
- [ ] T12345 取消訂單,DB 那筆消失
- [ ] T12345 切到明日,看到預設菜單(國泰)

### 管理員流程
- [ ] admin001 登入,切到「管理」視角
- [ ] 看到今日 3 筆訂單(T12345 雞腿、T12346 排骨、T12347 雞腿)
- [ ] 品項統計顯示:雞腿 x2 / 排骨 x1,總金額 $350
- [ ] 編輯菜單加一個品項,儲存,T12345 重整後看到

### Realtime
- [ ] 開兩個瀏覽器,A 是 admin,B 是員工
- [ ] B 下單後,A 的頁面 < 2 秒內出現新訂單(不用 F5)

### 權限
- [ ] T12345 在 console 跑 `supabase.from('orders').select()` 只看到自己的訂單
- [ ] T12345 試圖 update T12346 的訂單,被 RLS 拒絕
- [ ] 沒登入的 anon 完全看不到任何資料
```

---

## 6. Dynamic Workflow 規劃(Claude Code Agent)

> ⚠️ Opus 4.7 暫時不能跑,以下 workflow 設計成 **model-agnostic**:
> 寫好之後,把 `model: claude-opus-4-7` 換成 `claude-sonnet-4-6` 或 `claude-haiku-4-5` 都能跑,
> 等 Opus 4.7 開放再切回去,prompt 完全不用改。

### 6.1 為什麼用 Agent Workflow?

你個人開發這個小專案,**不一定需要 agent**,直接在 Claude Code chat 模式跑就好。
但若你想:
- 一次同時 prototype 多個方案比較(例如同時試 NextAuth vs Supabase Auth)
- 把 CI/CD 也納入 AI 流程(PR 自動 review + 自動修)
- 之後要把同樣的流程套用到下一個專案(robotics dashboard 等)

那 agent workflow 值得投資。

### 6.2 五個 Sub-Agent 角色定義

放在 `.claude/agents/*.md`,Claude Code 會自動辨識並可由主 agent 委派。

#### `architect.md`
```markdown
---
name: architect
description: 規劃資料模型、API 介面、權限矩陣。產出 SQL migration 跟 Type 定義,不寫 UI code。
model: claude-opus-4-7  # 退而求其次:claude-sonnet-4-6
tools: [view, str_replace, create_file, bash_tool]
---
你是一位資深系統架構師。給定需求,你會產出:
1. PostgreSQL migration SQL(含 RLS)
2. TypeScript type 定義(對應 DB schema)
3. API 介面合約(Server Action 或 REST)
4. 取捨討論(至少給 2 個方案 + 推薦)

你不寫 UI code,不寫業務邏輯實作,只決定「形狀」。
```

#### `coder.md`
```markdown
---
name: coder
description: 根據 architect 的設計實作 Next.js / React 元件、Server Action、Supabase 整合。
model: claude-sonnet-4-6  # Sonnet 寫 code 性價比最高
tools: [view, str_replace, create_file, bash_tool]
---
你是一位 Next.js 14 App Router 專家。你會:
1. 嚴格遵守 architect 給的 schema 跟 type
2. 用 Server Action 取代 client-side fetch(能不用 API route 就不用)
3. 用 supabase-js 而不是手寫 SQL
4. 用 Tailwind + shadcn/ui,不引入新的 UI library
5. 每個元件 < 200 行,超過就拆

寫完跑 `npm run typecheck && npm run lint`,有錯先自己修。
```

#### `reviewer.md`
```markdown
---
name: reviewer
description: 在 PR 階段檢查 coder 產出的 code 是否符合規範、有沒有安全問題、效能問題。
model: claude-opus-4-7
tools: [view, bash_tool]
---
你是嚴格的 senior engineer reviewer。你會檢查:
1. 安全:RLS 有沒有被繞過?敏感資訊有沒有露到前端?
2. 效能:有沒有 N+1 query?Server Component 有沒有正確使用?
3. 一致性:命名、檔案結構、錯誤處理有沒有跟既有 code 一致?
4. 簡潔:有沒有過度抽象、過度防禦的 code?

回報用 markdown checklist 格式,每個問題標 [P0|P1|P2|nit]。
不修 code,只提建議。
```

#### `tester.md`
```markdown
---
name: tester
description: 根據 architect 設計寫 Vitest unit/integration test + Playwright E2E test。
model: claude-sonnet-4-6
tools: [view, str_replace, create_file, bash_tool]
---
你是 QA 工程師。你會:
1. 對應每個 milestone 的驗收清單寫 E2E test
2. 對純函數(formatDate、CSV 格式化、價格計算)寫 unit test
3. 對跨層流程(下單 → 查詢)寫 integration test
4. 跑完 test,所有失敗的測試先自己修(test 端 OR 程式端都可以,但要說明改哪邊)

不寫產品 code,只寫 test。
```

#### `migrator.md`
```markdown
---
name: migrator
description: 把現有的單檔 React 元件拆解、搬移、改寫,保留 UI 設計、換掉資料層。
model: claude-sonnet-4-6
tools: [view, str_replace, create_file, bash_tool]
---
你是專門做 legacy migration 的工程師。原則:
1. **UI 完全保留** — 拒絕「順便重新設計」的誘惑,使用者已經習慣這個視覺
2. localStorage 操作一個一個換,每換一個 commit,可以隨時 rollback
3. 拆檔時優先按「畫面區塊」切,不按「資料類型」切

具體任務:把 `訂餐app.tsx` 657 行拆成:
- `app/(auth)/login/page.tsx` ← NameSetup
- `app/(app)/order/page.tsx` ← 員工點餐視角
- `app/(app)/admin/page.tsx` ← 管理員視角
- `components/DateSwitcher.tsx`, `components/MenuCard.tsx`, ...
- `lib/supabase.ts` (client + server)
- `lib/csv.ts` (CSV 匯出純函數)
- `hooks/useToast.ts`
```

### 6.3 Workflow 觸發策略

寫一份 `.claude/workflow.md` 當作主 agent 的 SOP:

```markdown
# Bento App 開發 Workflow

## 接到新需求(milestone / feature)
1. 主 agent 跟使用者澄清需求,寫成一段 user story
2. 啟動 @architect → 產 SQL + type + 介面 → 使用者 review
3. 啟動 @coder + @tester(平行)→ 一個寫 code 一個寫 test
4. 啟動 @reviewer → 給 review report
5. 主 agent 根據 review 修 code,或退回 @coder 修
6. 跑 test,綠了就 commit

## 接到 migration 任務(從舊 code 改)
1. 主 agent 確認要遷移哪一段
2. 啟動 @migrator → 拆 + 改 → commit
3. 啟動 @tester → 寫對應的 E2E 確保 UX 沒壞
4. @reviewer 最後檢查

## 升級 model
- Opus 4.7 開放後,把 architect / reviewer 切過去(品質敏感)
- coder / tester / migrator 保持 Sonnet(吞吐量敏感)
- 量大時 tester 可降到 Haiku 4.5(test code 模板化高)
```

### 6.4 一個具體執行範例(M4 — localStorage → Supabase 遷移)

```bash
$ claude
> 進入 M4 milestone:把 localStorage 操作遷移到 Supabase。
> 參考 PLAN.md 第 4.2 節 M4 部分。

# 主 agent 回應後,你下指令:
> @architect 設計 supabase 整合方式,要區分 client/server component,
> 確定哪些 query 在 server side(SSR)做、哪些在 client side 做。

# architect 產出設計後:
> @migrator 根據 architect 的設計,拆 訂餐app.tsx 並改寫 menus / orders 的存取。
> @tester 同時準備 E2E 測試,涵蓋 M4 驗收清單第一節「員工流程」。

# 兩個 agent 跑完後:
> @reviewer 對 migrator 跟 tester 的 PR 做 review。

# 根據 review 修,跑 test,綠了 commit、merge、進 M5
```

### 6.5 工作流的可演進性

這套設計的好處:
- **單機驗證**:Claude Code 跑在你本機,沒有額外成本
- **可導出**:`.claude/agents/*.md` 可以丟到下一個專案直接複用
- **可升級**:換 model 不用改 prompt
- **可協作**:之後同事加入,他在自己機器跑同一套 agent,風格一致

---

## 7. 風險與替代方案

### 7.1 風險矩陣

| 風險 | 機率 | 影響 | 緩解 |
|---|---|---|---|
| Supabase 免費方案被砍 | 低 | 中 | DB 是標準 Postgres,自架替代品 1 天搬完 |
| Vercel 突然開始計費 | 低 | 低 | 流量小,即使收費也是 $20/月內;可換 Cloudflare Pages |
| 公司 IT 不允許境外服務 | 中 | 高 | 整套自架版本:Docker Compose + Caddy + 公司內網 VPS |
| 員工不會用、抱怨 UX | 中 | 高 | UI 完全沿用現有設計,只換底層;先給 5 人 dogfood |
| 主管要加客製功能(部門預算、月結算等) | 高 | 中 | schema 已預留 department 欄位;月結算 SQL 寫一支 |

### 7.2 替代部署方案(若公司禁用境外服務)

**Option B — 全自架版**:

```yaml
# docker-compose.yml
services:
  app:
    build: .  # Next.js
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgresql://postgres:pwd@db:5432/bento
  db:
    image: postgres:16
    volumes: ["./pgdata:/var/lib/postgresql/data"]
    environment:
      POSTGRES_PASSWORD: pwd
      POSTGRES_DB: bento
  caddy:
    image: caddy:2
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
```

Auth 換成 **Authentik**(自架 SSO,也是 docker)或 **Lucia Auth**(Next.js 內建)。
丟到公司一台 Linux VM,Caddy 自動發內網憑證,完工。

---

## 8. 下一步行動清單

按你最少阻力路徑:

1. **先確認三件事**(影響架構選擇):
   - 規模:大概多少人會用?(50 / 200 / 500?)
   - IT 政策:公司允許用 Supabase / Vercel 嗎?或必須地端?
   - SSO:有公司 Google Workspace 嗎?還是要自己做帳號?

2. **本機跑通 M1 + M2**(半天就完成,先驗證概念)
   - 安裝 Supabase CLI
   - `supabase init && supabase start`
   - 套 schema、種子資料
   - Next.js 連線 OK

3. **決定要不要用 Agent Workflow**
   - 個人開發小專案:可跳過,Claude Code 直接 chat 模式跑
   - 想學/想之後複用:花一晚上寫 5 個 agent 定義

4. **告訴我你想先看哪個產出**,我可以直接生:
   - (a) 完整可跑的 `supabase/migrations/*.sql`
   - (b) Next.js 專案骨架(connection + 一個 demo 頁面)
   - (c) `.claude/agents/*.md` 五個 agent 完整 prompt
   - (d) 從 `訂餐app.tsx` 拆出來的元件結構範例(M4 起手式)

---

## Appendix A — 檔案結構(目標)

```
bento-app/
├── .claude/
│   ├── agents/
│   │   ├── architect.md
│   │   ├── coder.md
│   │   ├── reviewer.md
│   │   ├── tester.md
│   │   └── migrator.md
│   └── workflow.md
├── supabase/
│   ├── migrations/
│   │   ├── 20260101000000_init_schema.sql
│   │   ├── 20260101000001_rls_policies.sql
│   │   └── 20260101000002_seed_default_menu.sql
│   ├── seed.sql
│   └── config.toml
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx          ← header, toast, role switcher
│   │   ├── order/page.tsx      ← 員工點餐(對應現有 employee 視角)
│   │   └── admin/page.tsx      ← 管理員(對應現有 admin 視角)
│   └── api/
│       └── cron/notify/route.ts ← (選用)LINE 通知 cron
├── components/
│   ├── DateSwitcher.tsx
│   ├── MenuCard.tsx
│   ├── OrderSummary.tsx
│   ├── OrderTable.tsx
│   └── ui/                     ← shadcn 元件
├── lib/
│   ├── supabase/
│   │   ├── client.ts           ← browser client
│   │   ├── server.ts           ← Server Component / Action client
│   │   └── middleware.ts       ← session refresh
│   ├── csv.ts                  ← 從現有 handleExportCSV 抽出
│   └── date.ts                 ← formatDate 等
├── hooks/
│   ├── useToast.ts
│   └── useRealtimeOrders.ts
├── types/
│   └── database.ts             ← supabase gen types typescript
├── tests/
│   ├── unit/
│   │   ├── csv.test.ts
│   │   └── date.test.ts
│   ├── integration/
│   │   └── order-flow.test.ts
│   └── e2e/
│       ├── employee.spec.ts
│       └── admin.spec.ts
├── docker-compose.yml          ← (選用)地端部署
├── Dockerfile
├── next.config.mjs
├── tailwind.config.ts
├── package.json
└── README.md
```

## Appendix B — 命令速查表

```bash
# Local Supabase
supabase start              # 啟動本機 stack
supabase stop               # 停止
supabase db reset           # 重置 DB(套 migration + seed)
supabase migration new <name>  # 新 migration
supabase gen types typescript --local > types/database.ts

# Next.js
npm run dev                 # 本機開發
npm run build               # 產 production build
npm run typecheck
npm run lint

# Test
npm run test                # vitest
npm run test:e2e            # playwright

# Deploy(staging)
git push origin staging     # Vercel 自動 deploy preview
supabase db push --linked   # 推 migration 到雲端

# Claude Code
claude                      # 進 chat 模式
claude --agent architect    # 直接指定 agent(若有 sub-agent)
```
