---
name: bento-style-page
description: 用「夏日便當訂餐系統」的視覺風格產生新的頁面、後台管理頁、清單/表單或 CRUD 元件,與現有登入頁(橙黃漸層)、主畫面(gray-50 + 白卡 + 藍色點綴)配色完全一致。觸發:要在 dinbando / order_meal_system 專案新增畫面、admin 管理頁、統計表、設定頁,且需與現有 OrderApp / OrderHistory / UserManager 風格統一時。
---

# 夏日便當系統 UI 風格 — 產頁範本

把現有訂餐系統的視覺語言沉澱成可重複套用的規格。產生任何新畫面前,先讀本檔對齊 token,再參考三個樣板元件,最後依「產頁步驟」實作。

## 參考樣板(實際程式碼,直接照抄結構)

- `components/OrderApp.tsx` — 主 shell:header + tab group + toast + 日期列 + view 分支
- `components/OrderHistory.tsx` — 唯讀清單/表格 + 篩選下拉 + 空狀態
- `components/UserManager.tsx` — CRUD:新增表單 + 清單表格 + inline 編輯 + 狀態 badge
- `components/MenuEditor.tsx` — 自管表單狀態(用 `key={date}` remount 重設,避免同步 effect)
- `app/login/page.tsx` — 橙黃漸層登入/歡迎卡

## Style tokens

### 兩套主題
- **入口頁(登入/歡迎/單一動作)**:暖色。背景 `bg-gradient-to-br from-sky-100 via-yellow-50 to-emerald-50`;卡片 `bg-white p-8 rounded-[2rem] shadow-xl border-4 border-white ring-4 ring-yellow-100/50`;標題 `text-orange-900 font-extrabold`;主按鈕 `bg-gradient-to-r from-orange-500 to-yellow-500 ... rounded-2xl border-b-4 border-orange-700/20`;input `border-2 border-yellow-200 bg-yellow-50/30 rounded-2xl focus:ring-4 focus:ring-yellow-200`。
- **應用內頁(清單/管理/統計)**:藍色點綴。背景 `min-h-screen bg-gray-50 font-sans`;卡片 `bg-white rounded-2xl shadow-sm p-6 border border-gray-100`;主色 `text-blue-600` / `bg-blue-600`。

### 共用元件樣式(內頁)
- **卡片標題**:`<h2 className="text-lg font-bold text-gray-800 flex items-center"><Icon className="w-5 h-5 mr-2 text-blue-500" /> 標題</h2>`(統計用綠 `text-green-500`)
- **tab group**:容器 `flex bg-gray-100 p-1 rounded-lg`;按鈕 `px-3 py-1.5 text-sm font-medium rounded-md transition-colors`,選中 `bg-white shadow-sm text-blue-600`,未選 `text-gray-500 hover:text-gray-700`
- **input**:`px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm`
- **主按鈕**:`bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium`;危險 `text-red-600 hover:bg-red-50`;成功(匯出類)`bg-green-50 hover:bg-green-100 text-green-700 border border-green-200`
- **badge**:計數/角色 `bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold`;啟用 `bg-green-100 text-green-700`;停用 `bg-gray-100 text-gray-500`
- **表格**:`<table className="w-full text-left border-collapse">`;表頭列 `border-b border-gray-200 text-gray-500 text-sm`,`th` 加 `pb-2 font-medium`;資料列 `border-b border-gray-100 last:border-0 hover:bg-gray-50`,`td` 加 `py-3`,金額欄右對齊 `text-right`
- **toast**:`fixed top-20 left-1/2 -translate-x-1/2 z-50 ... bg-gray-800 text-white px-4 py-3 rounded-xl shadow-lg`,成功配 `CheckCircle2 text-green-400`,錯誤配 `AlertCircle text-red-400`,3 秒自動消失
- **空狀態**:置中 `text-gray-400`,大 icon `w-12 h-12 opacity-50` + 一句說明
- **圖示**:一律用 `lucide-react`

## 資料層慣例

- **讀取 / 員工自身寫入**:用 `@/lib/supabase/client` 的 `createClient()`(瀏覽器端),授權交給 RLS(`*_self_rw` / `*_admin_read`)。
- **需 service-role 的寫入(建帳號、跨使用者操作)**:開 `app/api/.../route.ts`,server 端先用 `@/lib/supabase/server` 取 session + `decodeClaims` 驗 `is_admin`,再用 `@/lib/supabase/admin` 的 `createAdminClient()` 操作。切勿把 service key 帶進 client bundle。
- **併發**:同一資源同鍵唯一性用 DB primary key + `upsert`;歷史快照欄位冗餘儲存(如 orders 存 item_name/price)避免被後續菜單變更影響。
- **時間性限制(截止鎖定)**:用 RLS **`as restrictive`** policy(涵蓋 insert/update/delete)。⚠️ 不要用 permissive `with check` —— 多個 permissive policy 之間是 OR,會被 `*_self_rw` 旁路而形同沒鎖;見 migration `20260601000004`。截止時間用 `@/lib/date` 的 `timeToDeadlineISO`(HH:MM+日期→timestamptz)與 `deadlineToTime`(反向,本地時區)轉換。
- **即時**:需即時同步的清單用 supabase realtime channel + `postgres_changes`,記得該表要加進 `supabase_realtime` publication。

## 產頁步驟

1. 判斷主題:獨立入口頁用暖色;應用內頁用藍色內頁主題,並掛進 `OrderApp` 的 `tabs` + view 分支。
2. 抄最接近的樣板(唯讀清單→OrderHistory;CRUD→UserManager;表單→MenuEditor)。
3. 型別放 `types/index.ts`;日期用 `@/lib/date`;CSV 用 `@/lib/csv`。
4. 決定資料層(client+RLS 或 server route+service role),依上節慣例。
5. `'use client'` 元件的資料載入 effect 用 `useCallback` 包查詢、`// eslint-disable-next-line react-hooks/set-state-in-effect`;表單預設值用 `key=` remount 而非同步 effect。
6. 驗證:`docker exec ... npm run typecheck` 與 `npm run lint` 皆需 exit 0。
