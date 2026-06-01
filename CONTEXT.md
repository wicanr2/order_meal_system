# CONTEXT — 便當訂購系統 Ubiquitous Language

> 命名變數、寫文件、agent 溝通一律優先使用下列術語。新概念先進這份再用。
> 格式:`Term — definition. _Avoid_: forbidden synonyms`

## 核心名詞

- **Profile** — 員工檔案,主鍵為 emp_id。對應現有 `userInfo`。_Avoid_: user, account, member。
- **emp_id** — 員工工號(如 `T12345`),登入與所有資料的關聯鍵。_Avoid_: uid, userId, staffNo。
- **DailyMenu** — 某一天的菜單,date 當主鍵(一天一份),含 restaurant + items[] + deadline。_Avoid_: menu(太籠統)。
- **DefaultMenu** — 預設常駐菜單(國泰夏季專案),存於 `default_menu_config`,取代寫死的 `DEFAULT_MENU`。
- **Order** — 一筆訂單,主鍵 (emp_id, date),一人一日一單。_Avoid_: booking, reservation。
- **Item** — 菜單品項 `{id, name, price}`,存於 DailyMenu.items jsonb。_Avoid_: dish, product, meal。
- **deadline** — 點餐截止時間;過了就鎖,不能新增 / 修改 Order。_Avoid_: cutoff, lockTime。
- **Admin** — 管理員(profiles.is_admin = true),可設菜單、看全員訂單、匯出。取代寫死白名單。
- **viewRole** — admin 在「員工視角 / 管理視角」之間切換的前端狀態。

## 角色 (Claude Code sub-agents)

- **architect / ux-designer / coder / tester / reviewer / migrator** — 見 `.claude/agents/*.md`。

## 環境

- **Local** — 本機 docker Supabase stack(supabase start)。_Avoid_: dev(語意模糊)。
- **Staging** — Supabase Cloud + Vercel Preview,給同事 UAT。
- **Production** — Supabase Cloud + Vercel Production,正式上線。

## 認證(本專案決策)

- **工號+密碼登入** — 採 custom auth:工號當 email prefix(如 `T12345@company-internal.local`),
  底層走 `supabase.auth.signInWithPassword`。_Avoid_: SSO, OAuth(本專案不採用)。
- **emp_id claim** — 經 Custom Access Token Hook 注入 JWT,供 RLS policy 使用(M3 完成)。

## Flagged ambiguities(待釐清)

- 「菜單」一詞在口語可能同時指 DailyMenu 與 DefaultMenu — 文件 / 程式請用明確的那個。
- 部門(department)報表的「部門」定義來源(HR 系統?手動維護?)尚未確認。
