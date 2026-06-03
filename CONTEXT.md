# CONTEXT — 便當訂購系統 Ubiquitous Language

> 命名變數、寫文件、agent 溝通一律優先使用下列術語。新概念先進這份再用。
> 格式:`Term — definition. _Avoid_: forbidden synonyms`

## 核心名詞

- **account_id** — 帳號唯一鍵 = `工號|姓名`(如 `T12345|王小明`)。profiles 主鍵、orders 擁有鍵、JWT `acct` claim。同工號不同名 = 不同 account_id = 兩個獨立帳號。_Avoid_: uid, userId。
- **Profile** — 員工檔案,主鍵為 account_id;emp_id/name 為顯示欄。對應現有 `userInfo`。_Avoid_: user, member。
- **emp_id** — 員工工號(如 `T12345`),顯示與分群用;**不再唯一**(同工號可有多筆不同姓名)。_Avoid_: staffNo。
- **email(opaque)** — auth↔profile 對應鍵,建立時挑一次後不可變:`工號@domain` 優先,同工號撞名才退 `工號.hex(姓名)@domain`。登入不靠公式推算,而是用 account_id 查回。_Avoid_: 把 email 當成可由姓名重算的值。
- **DailyMenu** — 某一天的菜單,date 當主鍵(一天一份),含 restaurant + items[] + deadline。_Avoid_: menu(太籠統)。
- **DefaultMenu** — 預設常駐菜單(國泰夏季專案),存於 `default_menu_config`,取代寫死的 `DEFAULT_MENU`。
- **Order** — 一筆訂單,主鍵 (account_id, date),一人一日一單;emp_id/emp_name 為顯示快照。_Avoid_: booking, reservation。
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

- **無密碼登入** — 以「工號 + 中文姓名」登入,姓名即帳號憑證(底層 password=姓名,走 `signInWithPassword`)。_Avoid_: SSO, OAuth(本專案不採用)。
- **自動建立(auto-create)** — 登入時 (工號,姓名) 不存在即自動建 auth user + Profile 並放行;免人為新增使用者,但每個登入身分都被系統記錄。入口 `/api/auth/ensure`。
- **acct claim** — Custom Access Token Hook 注入 JWT 的 account_id,供 orders RLS(`orders_self_rw`)判定擁有權;另注入 emp_id / name / is_admin。

## Flagged ambiguities(待釐清)

- 「菜單」一詞在口語可能同時指 DailyMenu 與 DefaultMenu — 文件 / 程式請用明確的那個。
- 部門(department)報表的「部門」定義來源(HR 系統?手動維護?)尚未確認。
