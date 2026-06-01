# .claude — dinbando 專案資產

這個目錄放本專案的 sub-agents、skills 與本機設定。

## Skills（`skills/`）

| Skill | 用途 |
|---|---|
| **bento-style-page** | 用「夏日便當系統」UI 風格產生新頁面 / 後台管理頁 / 清單 / CRUD,與現有 login(橙黃)、主畫面(藍色)配色一致。含 style tokens、樣板元件、資料層與併發慣例。 |
| **deploy-supabase-vercel** | 部署 SOP:Supabase cloud（建 project / link / db push / 啟用 auth hook / 建 admin）+ Vercel CLI production。含四個實測踩坑修正。 |

## Sub-agents（`agents/`）

對應 PLAN.md 的角色分工，主要用於規劃階段的 fan-out：

| Agent | 角色 | model |
|---|---|---|
| **architect** | 資料模型 / API / 權限矩陣 → SQL migration + Type，不寫 UI | opus |
| **ux-designer** | 使用者流程 / 資訊架構 / 互動狀態 → UI 規格 + Tailwind 指引，不寫業務邏輯 | opus |
| **coder** | 依 architect 設計實作 Next.js / React / Server Action / Supabase | sonnet |
| **migrator** | 拆解搬移單檔 React 原型,保留 UI、換掉資料層 | sonnet |
| **reviewer** | PR 階段審查規範 / 安全 / 效能 | opus |
| **tester** | Vitest unit/integration + Playwright/agent-browser E2E | sonnet |

## 本機設定

- `settings.local.json`（gitignore）：個人權限覆寫，例如 `Bash(git push:*)`。

## 開發 / 部署入口

- 本機開發：`docker compose -f docker-compose.dev.yml up -d`（port 3100，連 host 上 Supabase 54321）
- 部署上雲：見 skill **deploy-supabase-vercel**
- 新增畫面：見 skill **bento-style-page**
