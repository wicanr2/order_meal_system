'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { History, Receipt, CalendarDays } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { OrderRecord, Profile } from '@/types';

interface Props {
  isAdmin: boolean;
  myEmpId: string;
}

// 使用者歷程:員工看自己的歷史訂單;admin 可選特定員工或全員。
// 資料層走一般 client,RLS(orders_self_rw / orders_admin_read)負責授權。
export default function OrderHistory({ isAdmin, myEmpId }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<OrderRecord[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [filterEmp, setFilterEmp] = useState<string>(isAdmin ? 'ALL' : myEmpId);
  const [loading, setLoading] = useState(true);

  // admin:載入員工清單供篩選
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data } = await supabase
        .from('profiles').select('emp_id, name').order('emp_id');
      setStaff((data as Profile[]) ?? []);
    })();
  }, [isAdmin, supabase]);

  const load = useCallback(async () => {
    let q = supabase
      .from('orders')
      .select('emp_id, date, item_id, item_name, price, created_at, profiles(name)')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    if (isAdmin) {
      if (filterEmp !== 'ALL') q = q.eq('emp_id', filterEmp);
    } else {
      q = q.eq('emp_id', myEmpId);
    }
    const { data } = await q;
    setRows((data as unknown as OrderRecord[]) ?? []);
    setLoading(false);
  }, [supabase, isAdmin, filterEmp, myEmpId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const total = rows.reduce((s, o) => s + o.price, 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
      <div className="flex justify-between items-end mb-6">
        <h2 className="text-lg font-bold text-gray-800 flex items-center">
          <History className="w-5 h-5 mr-2 text-blue-500" />
          {isAdmin ? '訂餐歷程' : '我的訂餐歷程'}
        </h2>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <select
              value={filterEmp}
              onChange={(e) => setFilterEmp(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="ALL">全體員工</option>
              {staff.map((s) => (
                <option key={s.emp_id} value={s.emp_id}>
                  {s.emp_id} {s.name}
                </option>
              ))}
            </select>
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
                <th className="pb-2 font-medium text-right">金額</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {rows.map((o) => (
                <tr key={`${o.emp_id}_${o.date}`} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="py-3 font-medium text-gray-700">{o.date}</td>
                  {isAdmin && <td className="py-3 font-medium text-gray-500">{o.emp_id}</td>}
                  {isAdmin && <td className="py-3 font-medium text-gray-800">{o.profiles?.name ?? '—'}</td>}
                  <td className="py-3 text-gray-600">{o.item_name}</td>
                  <td className="py-3 text-right text-gray-800 font-medium">${o.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
