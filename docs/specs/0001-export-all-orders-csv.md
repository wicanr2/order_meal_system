# Spec 0001：一鍵匯出全部訂單明細 CSV

- 狀態：IMPLEMENTED，Local 驗收通過；Q3 待 staging 確認
- Issue：#1
- 日期：2026-09-25

## 1. 目標

管理員按一下，就能把資料庫裡所有日期的訂單明細下載成一份 CSV。
每一列代表某人某天訂了什麼。

匯出結果必須完整。筆數不足時要讓使用者看到失敗，不能產出一份看起來正常的殘缺檔案。

## 2. 現況

| 項目 | 現況 | 位置 |
|---|---|---|
| 既有匯出 | 只有每日、每週、每月，範圍依目前瀏覽的日期 | `components/OrderApp.tsx:243` |
| 查詢方式 | 前端直接查 Supabase | 同上 |
| 筆數上限 | PostgREST `max_rows = 1000`，超過會被截掉而且不報錯 | `supabase/config.toml:18` |
| 狀態篩選 | 統計畫面有篩選，但既有匯出沒有套用 | `components/OrderApp.tsx:85` |
| CSV 產生 | `ordersToCsv()`，UTF-8 BOM，每格都加雙引號 | `lib/csv.ts:18` |
| 時間格式化 | `formatDateTime()` 用執行環境的時區 | `lib/date.ts:9` |
| admin API 驗證 | `getAdminCaller()` 讀 server session 的 `is_admin` claim | `app/api/admin/users/route.ts:15` |

## 3. 完整性風險與對策

| # | 風險 | 後果 | 對策 |
|---|---|---|---|
| R1 | PostgREST `max_rows` 截斷 | 超過上限的列被丟掉，不報錯 | 由 DB 函式回傳單一 JSON 值，不是多列結果（4.2） |
| R2 | 雲端的 `max_rows` 在 Supabase 後台設定，和 `config.toml` 無關 | 本機通過，雲端上限不同 | 同 R1，設計不依賴這個值 |
| R3 | RLS 過濾 | 只讀到部分列，不報錯 | 用 service-role 呼叫；函式本身不授權給一般角色 |
| R4 | 分多次查詢時，每次看到的資料時間點不同 | 匯出期間有人下單或取消，會漏筆、重複，或狀態不一致 | 單一 SQL 查詢，看到的是同一個時間點的資料 |
| R5 | 伺服器時區是 UTC | 訂餐時間差 8 小時 | 時間在 SQL 裡用 `Asia/Taipei` 格式化成字串 |
| R6 | 傳輸或解析途中資料遺失 | 檔案少列 | 同一查詢回傳 `total`，API 在輸出前核對，不相等就回 500（4.3） |
| R7 | Vercel 一般回應上限 4.5 MB | 大檔案被拒絕，回 413 | 用串流回應，串流不受 4.5 MB 限制 |
| R8 | Vercel 函式執行時間上限 | 逾時，回 504 | fluid compute 預設 300 秒，預估用量在秒級，見第 7 節 |

R7、R8 的依據是 Vercel 官方文件，2026-09-25 查閱：
- <https://vercel.com/docs/functions/limitations>
- <https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions>

## 4. 設計

### 4.1 需求

- F1：管理視角的統計區塊新增「匯出全部」按鈕，放在現有「匯出 CSV」旁邊。
- F2：範圍是 `orders` 表的全部日期，沒有日期參數。
- F3：狀態沿用統計畫面現有的下拉選單（`statisticsStatusFilter`），可以選 `active`、`cancelled`、`all`，預設 `active`。
- F4：只有 Admin 可以呼叫，非 Admin 一律回 403。
- F5：沒有資料時回 200，檔案只有表頭，前端提示「沒有符合條件的訂單」。

### 4.2 DB 函式（新 migration）

檔名：`supabase/migrations/20260925000013_export_orders_fn.sql`

```sql
create or replace function public.export_orders(p_status text)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'total', count(*),
    'rows', coalesce(jsonb_agg(jsonb_build_array(
        o.date::text,
        coalesce(m.restaurant, d.restaurant, ''),
        o.order_serial,
        o.emp_id,
        o.emp_name,
        o.item_name,
        o.price,
        o.status,
        to_char(o.created_at   at time zone 'Asia/Taipei', 'YYYY-MM-DD HH24:MI:SS'),
        to_char(o.cancelled_at at time zone 'Asia/Taipei', 'YYYY-MM-DD HH24:MI:SS'),
        o.cancelled_by
      ) order by o.date, o.created_at, o.id), '[]'::jsonb)
  )
  from public.orders o
  left join public.daily_menus m on m.date = o.date
  left join public.default_menu_config d on d.id = 'default'
  where p_status = 'all' or o.status = p_status;
$$;

revoke all on function public.export_orders(text) from public, anon, authenticated;
grant execute on function public.export_orders(text) to service_role;
```

設計重點：
- `total` 和 `rows` 出自同一條查詢，資料時間點一致（R4）。
- 回傳單一 `jsonb` 值，只算一列，不會被 `max_rows` 截斷（R1、R2）。
  Local 實測 2503 筆：RPC 回傳完整 2503 列；同一環境直接查 `orders` 表只回 1000 列（正對照）。
- 列用陣列而不是物件，少了重複的 key，回傳大小大約減半。
- 只有 `service_role` 能執行（R3）。Postgres 新建的函式預設允許 PUBLIC 執行，所以要明確 revoke。
- `p_status` 的合法值在 API 層驗證，SQL 裡不再重複檢查。

### 4.3 API route

```
GET /api/admin/orders/export?status=active|cancelled|all
```

流程：
1. `getAdminCaller()` 驗證身分，失敗回 403。這個函式從 `users/route.ts` 抽到 `lib/admin-auth.ts` 共用。
2. 驗證 `status`，不合法回 400。
3. 用 `createAdminClient().rpc('export_orders', { p_status })` 取資料，失敗回 500。
4. **核對筆數**：確認 `rows.length === total`，而且 `total` 是非負整數，否則回 500，並寫 server log。
5. 用 `ReadableStream` 輸出：BOM 加表頭，再把每列轉成一行 CSV。
   第 4 步已經在記憶體裡核對完，所以串流開始之後不會再出現資料錯誤。
6. 回應 header：
   - `Content-Type: text/csv; charset=utf-8`
   - `Content-Disposition: attachment; filename*=UTF-8''訂餐全部明細_{status}_{YYYYMMDD-HHmm}.csv`，時間用 Asia/Taipei
   - `Cache-Control: no-store`
   - `X-Export-Total: {total}`，給前端二次核對用

| 情況 | 回應 |
|---|---|
| 未登入或非 Admin | `403 {"error":"forbidden"}` |
| status 值不合法 | `400 {"error":"invalid status"}` |
| RPC 失敗，或筆數核對不符 | `500 {"error":...}` |
| 成功 | `200`，body 是 CSV 串流 |

### 4.4 CSV 格式

| # | 欄位 | 來源 |
|---|---|---|
| 1 | 日期 | `orders.date` |
| 2 | 餐廳 | `daily_menus.restaurant`；當日沒有菜單列時用 `default_menu_config.restaurant` |
| 3 | 序號 | `orders.order_serial` |
| 4 | 工號 | `orders.emp_id`，下單當下的快照 |
| 5 | 姓名 | `orders.emp_name`，下單當下的快照 |
| 6 | 品項 | `orders.item_name` |
| 7 | 金額 | `orders.price` |
| 8 | 狀態 | `active` 顯示為 `有效`，`cancelled` 顯示為 `已取消` |
| 9 | 訂餐時間 | `YYYY-MM-DD HH:mm:ss`，Asia/Taipei |
| 10 | 取消時間 | 同上；沒取消就留空 |
| 11 | 取消者 | `orders.cancelled_by` |

- 排序：`date`，接著 `created_at`，最後 `id`。
- 編碼：UTF-8 with BOM，每格都加雙引號，換行 `\n`，和現有匯出一致。
- 取消時間的格式和現有匯出不同。現有匯出用的是 `toLocaleString('zh-TW')`。
  這次統一成跟訂餐時間相同的格式，現有匯出不改。

### 4.5 前端

- 按鈕用 `fetch` 呼叫 API，`res.ok` 為 false 時讀 `error`，顯示錯誤 toast。
- 成功時先取得 `blob`，數資料列數（行數扣掉表頭），和 `X-Export-Total` 比對。
  不相等就不下載，並顯示「匯出不完整，請重試」。
- 串流中斷時 `res.blob()` 會 reject，要 catch 起來並顯示「匯出失敗」，不下載。
- 下載期間按鈕 disabled，並顯示「匯出中」。
- `downloadCsv()` 改成字串和 Blob 都能接受。

CSV 的格子裡可能有換行，所以行數不一定等於列數。
這一版的欄位都不會含換行，所以直接數行數。如果之後加入備註欄，要改成真正解析 CSV 後再計數。

### 4.6 程式變更清單

| 檔案 | 變更 |
|---|---|
| `supabase/migrations/20260925000013_export_orders_fn.sql` | 新增 `export_orders()` |
| `lib/admin-auth.ts` | 新增，從 users route 抽出 `getAdminCaller()` |
| `app/api/admin/users/route.ts` | 改用 `lib/admin-auth.ts` |
| `app/api/admin/orders/export/route.ts` | 新增 |
| `lib/csv.ts` | 抽出跳脫字元與組一行 CSV 的共用函式；`ordersToCsv()` 對外行為不變；`downloadCsv()` 可以接受 Blob |
| `components/OrderApp.tsx` | 新增「匯出全部」按鈕、loading 狀態、筆數二次核對 |

不改任何資料表。

## 5. 驗收條件

測資：Local 用 SQL 灌 2500 筆訂單，涵蓋下列情況。

- 有效與已取消的訂單
- 有 `daily_menus` 的日期，以及沒有 `daily_menus` 的預設菜單日
- 訂餐時間在台灣時間 00:00 到 08:00 之間的訂單。這段時間的 UTC 日期是前一天，可以抓出時區錯誤
- 姓名含逗號、雙引號、全形字元

| # | 條件 | 驗證方式 |
|---|---|---|
| A1 | Admin 按下後能下載，Excel 開啟中文正常 | 手動 |
| A2 | 三種 status 的 CSV 資料列數，各自等於對應的 `select count(*)` | SQL 對照 |
| A3 | CSV 金額加總等於 `sum(price)` | SQL 對照 |
| A4 | 抽 5 筆比對時間欄位，和 `created_at at time zone 'Asia/Taipei'` 一致 | SQL 對照 |
| A5 | 預設菜單日的餐廳欄是預設餐廳名 | 抽查 |
| A6 | 含逗號、雙引號的姓名，Excel 能正確分欄 | 手動 |
| A7 | 非 Admin 呼叫、未登入呼叫都回 403 | curl |
| A8 | 用 `authenticated` 角色直接呼叫 `rpc('export_orders')` 會被拒絕 | curl 帶一般使用者 token |
| A9 | 人為讓核對失敗，例如在測試分支暫時截掉一列，API 回 500，前端不下載 | 暫時修改後再還原 |
| A10 | 既有的每日、每週、每月匯出行為不變 | 手動回歸 |
| A11 | `npm run typecheck`、`npm run lint` 通過 | docker 內執行 |

A2 同時是 R1 的正對照。如果 2500 筆只匯出 1000 筆，代表 4.2 的推論不成立，要改用分頁方案。

## 6. 範圍外

- 日期區間篩選。使用者已確認只要全部匯出。
- 部門欄位。`profiles.department` 目前沒有維護來源，見 `CONTEXT.md` 的待釐清項。
- 備註欄位 `orders.note`。
- xlsx 格式。
- 既有每月匯出與 `users` GET 的訂單計數，也有 1000 筆截斷風險，另開 issue 處理。
- `formatDateTime()` 依執行環境時區的問題。目前只在瀏覽器執行，影響不到；這次新功能不使用它。

## 7. 容量估算

- 假設：每日少於 200 筆，見 `PLAN.md` 1.3。一年大約 5 萬筆。
- JSON 回傳：每列約 150 bytes，一年約 7.5 MB。
- CSV 輸出：大小相近，所以要靠串流避開 4.5 MB 上限（R7）。
- 記憶體：Hobby 方案有 2 GB，數十 MB 內沒有問題。
- 實測（Local，2503 筆）：DB 執行 33 ms，API 回應 0.25 秒，CSV 315 KB。
  依此線性推估，5 萬筆約 6.3 MB、數秒內完成。這個大小超過 4.5 MB，所以需要串流（R7）。
- 資料量到每年 50 萬筆以上時要重新評估，改成分段匯出或非同步產檔。

## 8. 決議與待確認

- Q1（採預設）：當日沒有菜單列時，餐廳欄用預設餐廳名。
  已知限制：歷史日期如果後來改過預設餐廳，舊資料會顯示新的名稱。
- Q2（採預設）：取消者欄位維持 account_id（`工號|姓名`）。
- Q3（待確認）：Supabase 雲端對 `service_role` 的 `statement_timeout` 還沒查證。實作前要在 staging 查出來，並寫進 PR 描述。
