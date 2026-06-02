# 便當訂購系統 (order_meal_system)

公司內部午餐訂購系統。從單檔 React 原型(localStorage)演進為 Next.js + Supabase 的多人系統,已部署上線。

## 線上環境

正式網址:**https://order-meal-system.vercel.app**

- 員工登入:**工號 + 中文姓名**(無密碼)
- 管理員登入:工號 `admin` + 姓名 `系統管理員`

## 技術棧

- **前端**:Next.js 16 (App Router) + React 19 + Tailwind v4 + TypeScript
- **後端**:Supabase(Postgres + Auth + RLS),雲端 Seoul region
- **部署**:Vercel(production)
- **本機**:docker(Next dev container + Supabase CLI stack)

## 功能

- **員工**:依日期點餐 / 取消 / 查看「我的訂餐歷程」
- **管理員**:設定當日菜單(品項、**結單時間**、立即結束訂單)、訂單統計、CSV 匯出、**使用者管理**(新增 / 編輯 / 停用)、全員訂餐歷程
- **即時**:訂單變動即時更新(Supabase Realtime)
- **截止鎖定**:過結單時間後,於 DB 層(restrictive RLS)擋下新增 / 改單 / 取消,前端繞不過

## 認證(無密碼)

以「工號 + 中文姓名」登入。技術上沿用 Supabase Auth:工號轉小寫當 email prefix(`A200112` → `a200112@<domain>`),中文姓名作為帳號憑證(UTF-8 byte 數天然滿足密碼長度)。
⚠️ 認證強度等同「知道工號 + 姓名即可登入」,適用內部低敏場景;對外或敏感用途請加強(如共用通行碼)。

## 本機開發(docker-first)

```bash
# 1. 本機 Supabase stack
supabase start
# 2. schema + 種子資料
supabase db reset
node scripts/seed-auth.mjs          # 建本機 auth 帳號(db reset 後需重跑)
# 3. Next dev(跑在 docker container,port 3100)
docker compose -f docker-compose.dev.yml up -d
#   → 前端 http://localhost:3100   /   Supabase Studio http://localhost:54323
```

## 部署與維運

| 工作 | 方式 |
|---|---|
| 部署上雲(Supabase + Vercel) | 見 skill `.claude/skills/deploy-supabase-vercel` |
| 批次匯入使用者 | `scripts/import_users.py`(讀 xlsx → 建 auth + profile,無密碼模式) |
| 新增管理員帳號 | `scripts/create-admin.mjs`(支援 env 覆寫,可對本機 / 雲端) |

> 使用者名單 xlsx 含工號+姓名(等同登入憑證),已 gitignore,不入 repo。

## 目錄

| 路徑 | 內容 |
|---|---|
| `app/` | App Router:登入頁、主畫面、`api/admin/users` |
| `components/` | OrderApp / MenuEditor / OrderHistory / UserManager |
| `lib/` | supabase client/server/admin、date、csv、auth、jwt |
| `supabase/migrations/` | schema + RLS(含截止鎖定 restrictive policy) |
| `scripts/` | seed-auth / create-admin / import_users |
| `.claude/` | skills + 開發子代理(索引見 `.claude/README.md`) |
| `legacy/` | 原始單檔 React 原型 |

## 文件

- 規劃:[`PLAN.md`](./PLAN.md) ・ 術語:[`CONTEXT.md`](./CONTEXT.md)
- Claude 資產(skills / agents)索引:[`.claude/README.md`](./.claude/README.md)
