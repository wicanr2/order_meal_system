'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Utensils, Clock, ChevronLeft, ChevronRight,
  CheckCircle2, AlertCircle, Users, Receipt, UserCircle, LogOut,
  Store, Download, Lock,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { decodeClaims } from '@/lib/jwt';
import { addDays, today, isToday, timeToDeadlineISO, deadlineToTime } from '@/lib/date';
import { ordersToCsv, downloadCsv } from '@/lib/csv';
import MenuEditor from '@/components/MenuEditor';
import OrderHistory from '@/components/OrderHistory';
import UserManager from '@/components/UserManager';
import type { Menu, MenuItem, OrderRecord } from '@/types';

interface Me {
  acct: string;   // account_id = 工號|姓名,訂單擁有鍵
  empId: string;
  name: string;
  isAdmin: boolean;
}

// 導航分頁:員工 = order/history;admin 另含 menu/users
type View = 'order' | 'menu' | 'users' | 'history';

export default function OrderApp() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(today());
  const [view, setView] = useState<View>('order');

  const [defaultMenu, setDefaultMenu] = useState<Menu | null>(null);
  const [dailyMenu, setDailyMenu] = useState<Menu | null>(null); // 該日自訂菜單(null=用預設)
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 取得登入者身分(JWT claims + metadata)
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      const claims = decodeClaims(session.access_token);
      const meta = session.user.user_metadata ?? {};
      setMe({
        acct: claims.acct ?? '',
        empId: claims.emp_id ?? meta.emp_id ?? '',
        name: claims.name ?? meta.name ?? '',
        isAdmin: !!claims.is_admin,
      });
      // 預設菜單只載一次
      const { data } = await supabase
        .from('default_menu_config').select('restaurant, items').eq('id', 'default').single();
      if (data) setDefaultMenu({ restaurant: data.restaurant, items: data.items as MenuItem[] });
      setLoading(false);
    })();
  }, [supabase, router]);

  // 載入某日菜單 + 訂單
  const loadDay = useCallback(async (date: string) => {
    const [{ data: menu }, { data: ords }] = await Promise.all([
      supabase.from('daily_menus').select('restaurant, items, deadline').eq('date', date).maybeSingle(),
      supabase.from('orders').select('account_id, emp_id, emp_name, date, item_id, item_name, price, created_at')
        .eq('date', date).order('created_at'),
    ]);
    setDailyMenu(menu ? { restaurant: menu.restaurant, items: menu.items as MenuItem[], deadline: menu.deadline } : null);
    setOrders((ords as unknown as OrderRecord[]) ?? []);
  }, [supabase]);

  // 切換日期/登入後載入當日資料。loadDay 為 async,setState 發生在 await 之後,非同步 render loop。
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (me) loadDay(currentDate); }, [me, currentDate, loadDay]);

  // Realtime:當日訂單變動即時更新(admin 最有感)
  useEffect(() => {
    if (!me) return;
    const channel = supabase
      .channel(`orders-${currentDate}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `date=eq.${currentDate}` },
        () => loadDay(currentDate))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [me, currentDate, supabase, loadDay]);

  // 當日有效菜單 = 自訂 ?? 預設
  const currentMenu: Menu | null = dailyMenu ?? defaultMenu;

  const myOrder = useMemo(
    () => (me ? orders.find((o) => o.account_id === me.acct) ?? null : null),
    [orders, me],
  );

  // 截止鎖定
  const isLocked = useMemo(() => {
    const dl = currentMenu?.deadline;
    return !!dl && new Date() > new Date(dl);
  }, [currentMenu]);

  // ── 員工:送出 / 取消 ──
  const submitOrder = async (item: MenuItem) => {
    if (!me) return;
    const { error } = await supabase.from('orders').upsert({
      account_id: me.acct, emp_id: me.empId, emp_name: me.name, date: currentDate,
      item_id: item.id, item_name: item.name, price: item.price,
    });
    if (error) { showToast(isLocked ? '已過截止時間,無法點餐' : '送出失敗', 'error'); return; }
    showToast('訂單已送出!');
    loadDay(currentDate);
  };

  const cancelOrder = async () => {
    if (!me) return;
    const { error } = await supabase.from('orders').delete().match({ account_id: me.acct, date: currentDate });
    if (error) { showToast('取消失敗', 'error'); return; }
    showToast('訂單已取消');
    loadDay(currentDate);
  };

  // ── admin:菜單編輯 ──
  const saveMenu = async (restaurant: string, items: MenuItem[], deadlineTime: string) => {
    if (!me || !restaurant.trim() || items.length === 0) {
      showToast('請輸入餐廳名稱並至少加入一個品項', 'error'); return;
    }
    const { error } = await supabase.from('daily_menus').upsert({
      date: currentDate, restaurant: restaurant.trim(), items,
      deadline: timeToDeadlineISO(currentDate, deadlineTime), updated_by: me.acct,
    });
    if (error) { showToast('儲存失敗', 'error'); return; }
    showToast('菜單已儲存並發布!');
    loadDay(currentDate);
  };

  const deleteMenu = async () => {
    const { error } = await supabase.from('daily_menus').delete().eq('date', currentDate);
    if (error) { showToast('操作失敗', 'error'); return; }
    showToast('已恢復預設菜單');
    loadDay(currentDate);
  };

  // 立即結束本日訂單:把當前菜單(可能是預設)落地成當日菜單,deadline 設為現在 → 立即鎖定
  const endOrderNow = async () => {
    if (!me || !currentMenu) return;
    const { error } = await supabase.from('daily_menus').upsert({
      date: currentDate, restaurant: currentMenu.restaurant, items: currentMenu.items,
      deadline: new Date().toISOString(), updated_by: me.acct,
    });
    if (error) { showToast('操作失敗', 'error'); return; }
    showToast('已結束本日訂單');
    loadDay(currentDate);
  };

  const exportCsv = () => {
    if (orders.length === 0) { showToast('目前沒有訂單可匯出', 'error'); return; }
    const csv = ordersToCsv(orders.map((o) => ({
      empId: o.emp_id, name: o.emp_name,
      itemName: o.item_name, price: o.price, createdAt: o.created_at,
    })));
    downloadCsv(`訂餐明細_${currentDate}.csv`, csv);
    showToast('CSV 匯出成功!');
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  if (loading || !me) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-500 font-medium">載入中...</p>
      </div>
    );
  }

  const totalAmount = orders.reduce((s, o) => s + o.price, 0);

  const tabs: { key: View; label: string }[] = me.isAdmin
    ? [
        { key: 'order', label: '點餐' },
        { key: 'menu', label: '菜單' },
        { key: 'users', label: '使用者' },
        { key: 'history', label: '歷程' },
      ]
    : [
        { key: 'order', label: '點餐' },
        { key: 'history', label: '我的歷程' },
      ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-10 font-sans">
      {/* 頂部導航 */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Utensils className="text-blue-600 w-6 h-6" />
            <span className="font-bold text-gray-800 text-lg">訂餐系統</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full text-sm">
              <UserCircle className="w-4 h-4 mr-2" />
              {me.name} ({me.empId})
            </div>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              {tabs.map((t) => (
                <button key={t.key} onClick={() => setView(t.key)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${view === t.key ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <button onClick={logout} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="登出">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {toast && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 flex items-center bg-gray-800 text-white px-4 py-3 rounded-xl shadow-lg">
          {toast.type === 'success'
            ? <CheckCircle2 className="w-5 h-5 mr-2 text-green-400" />
            : <AlertCircle className="w-5 h-5 mr-2 text-red-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* 日期選擇器 */}
        <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between">
          <button onClick={() => setCurrentDate(addDays(currentDate, -1))} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-center flex-1">
            <h2 className="text-xl font-bold text-gray-800">{currentDate}</h2>
            <button onClick={() => setCurrentDate(today())}
              className={`text-sm mt-1 font-medium ${isToday(currentDate) ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'}`}>
              {isToday(currentDate) ? '今天' : '回到今天'}
            </button>
          </div>
          <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {view === 'order' && (
          <div className="space-y-6">
            {!currentMenu ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-dashed border-gray-200">
                <Store className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700">這天還沒有設定菜單喔</h3>
                <p className="text-gray-500 mt-2">請稍後再回來看,或提醒管理員設定</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{currentMenu.restaurant}</h2>
                    <p className="text-gray-500 text-sm mt-1 flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {currentMenu.deadline
                        ? `${deadlineToTime(currentMenu.deadline)} 前結單`
                        : '今日不限結單時間'}
                    </p>
                  </div>
                </div>

                {isLocked && !myOrder && (
                  <div className="mb-4 flex items-center bg-gray-100 text-gray-600 px-4 py-3 rounded-xl text-sm">
                    <Lock className="w-4 h-4 mr-2" /> 已過點餐截止時間,無法再下單
                  </div>
                )}

                {myOrder ? (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-bold text-blue-900 mb-1">您已成功點餐!</h3>
                    <p className="text-blue-700 font-medium mb-6">
                      {myOrder.item_name} <span className="text-blue-500 mx-2">|</span> ${myOrder.price}
                    </p>
                    {!isLocked && (
                      <button onClick={cancelOrder} className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg font-medium transition-colors">
                        取消 / 重新點餐
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentMenu.items.map((item) => (
                      <div key={item.id} className="border border-gray-200 rounded-xl p-4 flex justify-between items-center hover:border-blue-300 hover:shadow-md transition-all group">
                        <div>
                          <h4 className="font-semibold text-gray-800">{item.name}</h4>
                          <p className="text-blue-600 font-bold mt-1">${item.price}</p>
                        </div>
                        <button onClick={() => submitOrder(item)} disabled={isLocked}
                          className="bg-gray-100 hover:bg-blue-600 text-gray-700 hover:text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-100 disabled:hover:text-gray-700">
                          點餐
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {view === 'menu' && me.isAdmin && (
          <div className="space-y-6">
            {/* 菜單編輯(key=date 以重設表單) */}
            <MenuEditor
              key={currentDate}
              initialRestaurant={currentMenu?.restaurant ?? ''}
              initialItems={currentMenu?.items ?? []}
              initialDeadline={currentMenu?.deadline}
              hasDailyMenu={!!dailyMenu}
              onSave={saveMenu}
              onDelete={deleteMenu}
              onEndNow={endOrderNow}
            />

            {/* 訂單統計 */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <div className="flex justify-between items-end mb-6">
                <h2 className="text-lg font-bold text-gray-800 flex items-center">
                  <Receipt className="w-5 h-5 mr-2 text-green-500" /> 訂單統計
                </h2>
                <div className="text-right flex flex-col items-end">
                  <p className="text-sm text-gray-500">總金額</p>
                  <p className="text-2xl font-bold text-green-600 mb-2">${totalAmount}</p>
                  {orders.length > 0 && (
                    <button onClick={exportCsv}
                      className="flex items-center text-sm bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-medium transition-colors border border-green-200">
                      <Download className="w-4 h-4 mr-1" /> 匯出 CSV
                    </button>
                  )}
                </div>
              </div>

              {orders.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>目前還沒有人點餐喔</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">品項總計</h3>
                    <div className="space-y-2">
                      {Object.entries(orders.reduce<Record<string, { count: number; price: number }>>((acc, o) => {
                        if (!acc[o.item_name]) acc[o.item_name] = { count: 0, price: o.price };
                        acc[o.item_name].count += 1;
                        return acc;
                      }, {})).map(([itemName, data]) => (
                        <div key={itemName} className="flex justify-between items-center bg-gray-50 px-4 py-2 rounded-lg">
                          <div className="flex items-center">
                            <span className="font-medium text-gray-800">{itemName}</span>
                            <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">x {data.count}</span>
                          </div>
                          <span className="text-gray-600 font-medium">${data.price * data.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">人員明細</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200 text-gray-500 text-sm">
                            <th className="pb-2 font-medium">工號</th>
                            <th className="pb-2 font-medium">姓名</th>
                            <th className="pb-2 font-medium">品項</th>
                            <th className="pb-2 font-medium text-right">金額</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {orders.map((o) => (
                            <tr key={o.account_id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                              <td className="py-3 font-medium text-gray-500">{o.emp_id}</td>
                              <td className="py-3 font-medium text-gray-800">{o.emp_name}</td>
                              <td className="py-3 text-gray-600">{o.item_name}</td>
                              <td className="py-3 text-right text-gray-800 font-medium">${o.price}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'users' && me.isAdmin && <UserManager />}

        {view === 'history' && (
          <OrderHistory isAdmin={me.isAdmin} myAcct={me.acct} />
        )}
      </main>
    </div>
  );
}
