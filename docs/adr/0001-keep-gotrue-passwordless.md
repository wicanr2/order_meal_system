# ADR 0001 — 無密碼登入下,保留 GoTrue 並將 email/password 視為內部 plumbing

- 狀態:已採納(Accepted)
- 日期:2026-06-03
- 範圍:dinbando(order_meal_system)身分與登入

## 背景

系統登入改為「工號 + 中文姓名」無密碼模式,並支援登入時自動建立使用者;
身分唯一鍵為 `account_id = 工號|姓名`(同工號不同名 = 兩個獨立帳號)。
詳見 `CONTEXT.md` 與 migration `20260601000005_composite_identity.sql`。

在此模型下,業務層**真正的憑證只有 `(工號, 姓名)`**。Supabase Auth(GoTrue)
仍要求每個帳號有 `email` 與 `password`,於是出現兩個看似多餘的欄位:

- `password = 姓名` —— 與 `name` 欄位重複。
- `email = 工號@domain`(撞名退 `工號.hex(姓名)@domain`)—— 只是 GoTrue 要求的唯一帳號 handle。

問題:既然邏輯上不需要 password/email,要不要把它們移除?

## 決策

**保留 GoTrue;email/password 僅作為發放 session 用的內部實作細節(plumbing),不視為業務資料。**

- 使用者介面與使用者管理**不出現** password/email;登入只輸入工號 + 姓名。
- `email` 為「不可變 opaque 值」,建立帳號時挑一次後不再變動;登入端不靠公式推算,
  而是用 `account_id` 查 profile 取回既存 email(見 `/api/auth/ensure`)。
- `password` 由後端設為姓名,前端不經手。

## 為何不選「完全移除(自簽 JWT)」

要真正消滅 email/password,必須**不再使用 GoTrue**,改由後端驗 `(工號,姓名)` 後
用專案 JWT secret 自簽 Supabase 相容 JWT、自行管理 cookie。代價:

- 需重接整個 session 層:middleware、server/client Supabase client、token refresh、登出。
- 失去 GoTrue 既有的 refresh-token rotation、session 管理、與 supabase-js 的 session 介面整合。
- 對一個內部小工具而言,風險與工時不成比例。

GoTrue 框架下 email/password 無法單獨拔除(GoTrue 必須以 email 當識別、password 當 grant),
因此這是「保留 GoTrue」與「完全自簽」之間的二選一,而非可漸進移除的欄位。

## 影響

- 正面:零額外風險、零重構;沿用 Supabase 的 session/refresh/RLS 驗證;email/password 對使用者完全透明。
- 取捨:auth schema 仍帶兩個非業務欄位,需在文件中持續標明其為 plumbing,避免日後被誤認為可由姓名重算或需要使用者維護。
- 雲端無痕 migration 的關鍵正建立在「email opaque、不重算」之上:既有帳號 email/password 不動 → 現有使用者不受影響。

## 後續可重新評估的觸發條件

- 若未來需要 SSO / 企業目錄整合,或要徹底擺脫 GoTrue,再回頭評估「自簽 JWT」方案。
