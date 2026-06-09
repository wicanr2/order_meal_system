'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, Save, X, Pencil, ShieldCheck, Ban, RotateCcw, Trash2,
} from 'lucide-react';
import type { Profile } from '@/types';

interface Props {
  currentAcct: string;
}

// 使用者管理(admin only)。無密碼模式:員工以「工號 + 中文姓名」登入,
// 姓名即登入憑證,故不設密碼欄;改名等同改憑證。寫入經 /api/admin/users。
export default function UserManager({ currentAcct }: Props) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');

  // 新增表單
  const [nEmpId, setNEmpId] = useState('');
  const [nName, setNName] = useState('');
  const [nDept, setNDept] = useState('');
  const [nAdmin, setNAdmin] = useState(false);

  // 編輯中的列
  const [editId, setEditId] = useState<string | null>(null);
  const [eName, setEName] = useState('');
  const [eDept, setEDept] = useState('');
  const [eAdmin, setEAdmin] = useState(false);

  const flash = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  };

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/users');
    if (!res.ok) { setLoading(false); flash('讀取使用者失敗', 'error'); return; }
    const json = await res.json();
    setUsers((json.users as Profile[]) ?? []);
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!nEmpId.trim() || !nName.trim()) {
      flash('工號、姓名為必填', 'error'); return;
    }
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empId: nEmpId, name: nName, department: nDept, isAdmin: nAdmin }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { flash(json.error ?? '新增失敗', 'error'); return; }
    setNEmpId(''); setNName(''); setNDept(''); setNAdmin(false);
    flash('員工已新增');
    load();
  };

  const startEdit = (u: Profile) => {
    setEditId(u.account_id);
    setEName(u.name);
    setEDept(u.department ?? '');
    setEAdmin(u.is_admin);
  };

  const saveEdit = async (acct: string) => {
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acct, name: eName, department: eDept, isAdmin: eAdmin }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { flash(json.error ?? '更新失敗', 'error'); return; }
    setEditId(null);
    flash('已更新(改名等同改登入身分;角色變更需該員工重新登入生效)');
    load();
  };

  const toggleActive = async (u: Profile) => {
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acct: u.account_id, active: !(u.active ?? true) }),
    });
    if (!res.ok) { flash('操作失敗', 'error'); return; }
    flash((u.active ?? true) ? '已停用(無法登入)' : '已啟用');
    load();
  };

  const deleteUser = async (u: Profile) => {
    if (u.account_id === currentAcct) {
      flash('不能刪除目前登入中的管理員帳號', 'error');
      return;
    }
    if ((u.order_count ?? 0) > 0) {
      flash('已有訂單紀錄,只能停用不能刪除', 'error');
      return;
    }
    if (!window.confirm(`確定刪除 ${u.emp_id} ${u.name}? 此操作只適用於誤建且無訂單的帳號。`)) return;
    const res = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acct: u.account_id }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { flash(json.error ?? '刪除失敗', 'error'); return; }
    flash('誤建帳號已刪除');
    load();
  };

  const filteredUsers = users.filter((u) => {
    const active = u.active ?? true;
    if (statusFilter === 'active') return active;
    if (statusFilter === 'inactive') return !active;
    return true;
  });

  const inputCls =
    'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm';

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
          msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {msg.text}
        </div>
      )}

      {/* 新增員工 */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-1 flex items-center">
          <UserPlus className="w-5 h-5 mr-2 text-blue-500" /> 新增員工
        </h2>
        <p className="text-xs text-gray-500 mb-4">員工以「工號 + 中文姓名」登入,無需密碼。</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">工號</label>
            <input value={nEmpId} onChange={(e) => setNEmpId(e.target.value)} placeholder="A200112" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">中文姓名</label>
            <input value={nName} onChange={(e) => setNName(e.target.value)} placeholder="王小明" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">部門</label>
            <input value={nDept} onChange={(e) => setNDept(e.target.value)} placeholder="系統軟體開發處" className={inputCls} />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center text-sm font-medium text-gray-700 gap-1.5">
              <input type="checkbox" checked={nAdmin} onChange={(e) => setNAdmin(e.target.checked)} className="w-4 h-4 accent-blue-600" />
              管理員
            </label>
            <button onClick={create}
              className="ml-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center transition-colors">
              <UserPlus className="w-4 h-4 mr-1" /> 新增
            </button>
          </div>
        </div>
      </div>

      {/* 員工清單 */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2 text-blue-500" /> 員工清單
          <span className="ml-2 bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-bold">{filteredUsers.length}</span>
        </h2>
        <div className="mb-4 flex flex-wrap gap-2">
          {([
            ['active', '啟用'],
            ['inactive', '停用'],
            ['all', '全部'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400">載入中…</div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-400">沒有符合條件的員工</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 text-sm">
                  <th className="pb-2 font-medium">工號</th>
                  <th className="pb-2 font-medium">姓名</th>
                  <th className="pb-2 font-medium">部門</th>
                  <th className="pb-2 font-medium">角色</th>
                  <th className="pb-2 font-medium">狀態</th>
                  <th className="pb-2 font-medium text-right">訂單</th>
                  <th className="pb-2 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filteredUsers.map((u) => {
                  const editing = editId === u.account_id;
                  const active = u.active ?? true;
                  const orderCount = u.order_count ?? 0;
                  const isSelf = u.account_id === currentAcct;
                  const deleteDisabled = isSelf || orderCount > 0;
                  const deleteTitle = isSelf
                    ? '不能刪除目前登入帳號'
                    : orderCount > 0
                      ? '該使用者有訂單不能刪除'
                      : '刪除誤建帳號';
                  return (
                    <tr key={u.account_id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-500">{u.emp_id}</td>
                      <td className="py-3">
                        {editing
                          ? <input value={eName} onChange={(e) => setEName(e.target.value)} className={inputCls} />
                          : <span className="font-medium text-gray-800">{u.name}</span>}
                      </td>
                      <td className="py-3">
                        {editing
                          ? <input value={eDept} onChange={(e) => setEDept(e.target.value)} placeholder="部門" className={inputCls} />
                          : <span className="text-gray-600">{u.department ?? '—'}</span>}
                      </td>
                      <td className="py-3">
                        {editing ? (
                          <label className="flex items-center text-sm gap-1.5">
                            <input type="checkbox" checked={eAdmin} onChange={(e) => setEAdmin(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                            管理員
                          </label>
                        ) : u.is_admin ? (
                          <span className="inline-flex items-center bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">
                            <ShieldCheck className="w-3 h-3 mr-1" /> 管理員
                          </span>
                        ) : (
                          <span className="text-gray-500 text-xs">一般</span>
                        )}
                      </td>
                      <td className="py-3">
                        {active
                          ? <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-bold">啟用</span>
                          : <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full font-bold">停用</span>}
                      </td>
                      <td className="py-3 text-right text-gray-500 font-medium">{orderCount}</td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-2">
                          {editing ? (
                            <>
                              <button onClick={() => saveEdit(u.account_id)} title="儲存"
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Save className="w-4 h-4" /></button>
                              <button onClick={() => setEditId(null)} title="取消"
                                className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEdit(u)} title="編輯"
                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                              <button onClick={() => toggleActive(u)} title={active ? '停用' : '啟用'}
                                className={`p-1.5 rounded-lg transition-colors ${active ? 'text-gray-500 hover:text-red-600 hover:bg-red-50' : 'text-gray-500 hover:text-green-600 hover:bg-green-50'}`}>
                                {active ? <Ban className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                              </button>
                              <span title={deleteTitle} className="inline-flex">
                                <button onClick={() => deleteUser(u)}
                                  disabled={deleteDisabled}
                                  className="p-1.5 text-gray-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-500 disabled:hover:bg-transparent">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
