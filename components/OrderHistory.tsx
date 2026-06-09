'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { History, Receipt, CalendarDays } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { OrderRecord, Profile } from '@/types';

interface Props {
  isAdmin: boolean;
  myAcct: string;   // account_id = 工號|姓名
}

// 使用者紀錄:員工看自己的歷史訂單;admin 可選特定員工或全員。
// 資料層走一般 client,RLS(orders_self_rw / orders_admin_read)負責授權。
export default function OrderHistory({ isAdmin, myAcct }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<OrderRecord[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [filterAcct, setFilterAcct] = useState<string>(isAdmin ? 'ALL' : myAcct);
  const [staffStatus, setStaffStatus] = useState<'active' | 'inactive' | 'all'>('active');
  const [loading, setLoading] = useState(true);

  // admin:載入員工清單供篩選
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data } = await supabase
        .from('profiles').select('account_id, emp_id, name, active').order('emp_id');
      setStaff((data as Profile[]) ?? []);
    })();
  }, [isAdmin, supabase]);

  const load = useCallback(async () => {
    let q = supabase
      .from('orders')
      .select('id, account_id, emp_id, emp_name, date, item_id, item_name, price, status, cancelled_at, cancelled_by, cancellation_history, created_at')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    if (isAdmin) {
      if (filterAcct !== 'ALL') q = q.eq('account_id', filterAcct);
      else if (staffStatus !== 'all') {
        const accts = staff
          .filter((s) => (staffStatus === 'active' ? s.active ?? true : !(s.active ?? true)))
          .map((s) => s.account_id);
        if (accts.length === 0) {
          setRows([]);
          setLoading(false);
          return;
        }
        q = q.in('account_id', accts);
      }
    } else {
      q = q.eq('account_id', myAcct);
    }
    const { data } = await q;
    setRows((data as unknown as OrderRecord[]) ?? []);
    setLoading(false);
  }, [supabase, isAdmin, filterAcct, myAcct, staff, staffStatus]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const total = rows.reduce((s, o) => s + ((o.status ?? 'active') === 'active' ? o.price : 0), 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
      <div className="flex justify-between items-end mb-6">
        <h2 className="text-lg font-bold text-gray-800 flex items-center">
          <History className="w-5 h-5 mr-2 text-blue-500" />
          {isAdmin ? '訂餐紀錄' : '我的訂餐紀錄'}
        </h2>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <>
              <select
                value={staffStatus}
                onChange={(e) => { setStaffStatus(e.target.value as 'active' | 'inactive' | 'all'); setFilterAcct('ALL'); }}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="active">啟用員工</option>
                <option value="inactive">停用員工</option>
                <option value="all">全部員工</option>
              </select>
              <select
                value={filterAcct}
                onChange={(e) => setFilterAcct(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="ALL">全體員工</option>
                {staff
                  .filter((s) => staffStatus === 'all' || (staffStatus === 'active' ? s.active ?? true : !(s.active ?? true)))
                  .map((s) => (
                    <option key={s.account_id} value={s.account_id}>
                      {s.emp_id} {s.name}{(s.active ?? true) ? '' : ' (停用)'}
                    </option>
                  ))}
              </select>
            </>
          )}
          <div className="text-right">
            <p className="text-xs text-gray-500">累計金額</p>
            <p className="text-xl font-bold text-green-600">${total}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">載入中…</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>沒有歷史訂單</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 text-sm">
                <th className="pb-2 font-medium">
                  <span className="flex items-center"><CalendarDays className="w-4 h-4 mr-1" />日期</span>
                </th>
                {isAdmin && <th className="pb-2 font-medium">工號</th>}
                {isAdmin && <th className="pb-2 font-medium">姓名</th>}
                <th className="pb-2 font-medium">品項</th>
                <th className="pb-2 font-medium">下訂時間</th>
                <th className="pb-2 font-medium">狀態</th>
                <th className="pb-2 font-medium text-right">金額</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {rows.map((o) => (
                <tr key={o.id ?? `${o.account_id}_${o.date}_${o.created_at ?? o.item_id}_${o.status ?? 'active'}`} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="py-3 font-medium text-gray-700">{o.date}</td>
                  {isAdmin && <td className="py-3 font-medium text-gray-500">{o.emp_id}</td>}
                  {isAdmin && <td className="py-3 font-medium text-gray-800">{o.emp_name}</td>}
                  <td className="py-3 text-gray-600">{o.item_name}</td>
                  <td className="py-3 text-gray-500 whitespace-nowrap">
                    {o.created_at ? new Date(o.created_at).toLocaleTimeString('zh-TW', { hour12: false }) : '-'}
                  </td>
                  <td className="py-3">
                    {(o.status ?? 'active') === 'cancelled'
                      ? <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full font-bold">已取消</span>
                      : <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-bold">有效</span>}
                  </td>
                  <td className={`py-3 text-right font-medium ${(o.status ?? 'active') === 'cancelled' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>${o.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
