# 便當訂購系統 (order_meal_system)

從單檔 React 原型(localStorage)演進為 Next.js + Supabase 的多人系統。完整規劃見 [`PLAN.md`](./PLAN.md),術語見 [`CONTEXT.md`](./CONTEXT.md)。

## 技術棧

- **前端 / 部署**:Next.js 14 (App Router) + Tailwind + shadcn/ui,部署於 Vercel
- **後端**:Supabase(Postgres + Auth + RLS)
- **認證**:工號 + 密碼(custom auth,工號當 email prefix)
- **本機環境**:Supabase CLI(docker stack)

## 本機開發

```bash
# 1. 啟動本機 Supabase(首次會拉 docker image)
supabase start
supabase status            # 取得本機 anon / service_role key

# 2. 套用 schema + 種子資料
supabase db reset

# 3. 設定前端環境變數
cp .env.local.example .env.local   # 填入 supabase status 的 key

# 4. 啟動前端
npm install
npm run dev                # http://localhost:3000
```

Supabase Studio:http://localhost:54323

## 目錄

| 路徑 | 內容 |
|---|---|
| `supabase/migrations/` | schema + RLS migration |
| `supabase/seed.sql` | 種子資料(1 admin + 5 員工 + 菜單 + 訂單) |
| `.claude/agents/` | 六個開發子代理(architect / ux-designer / coder / tester / reviewer / migrator) |
| `.claude/workflow.md` | 開發 SOP |
| `legacy/` | 原始單檔 React 原型(migrator 參考) |

## Milestone 進度

- [x] CLI 安裝(supabase / vercel)
- [~] M1 — 本機 Supabase + Schema(migration 已寫,待 `supabase start` 完成驗證)
- [ ] M2 — Next.js 骨架 + 連線
- [ ] M3 — Auth(工號+密碼 custom auth)
- [ ] M4 — localStorage → Supabase 遷移
- [ ] M5 — 截止時間 + 部門 + 通知
- [ ] M6 — Staging 上雲 + UAT
- [ ] M7 — Production

## 雲端(切回對外網路再做)

Supabase 專案 `vasbnvpknlwoqyxwhrac` 已建立。連線測試與 migration push 待對外網路:

```bash
supabase login              # 用 access token
supabase link --project-ref vasbnvpknlwoqyxwhrac
supabase db push            # 推 migration 上雲
```
