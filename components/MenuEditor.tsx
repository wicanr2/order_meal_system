'use client';

import { useState } from 'react';
import { Store, Trash2, Plus, Save, Clock, Ban } from 'lucide-react';
import { deadlineToTime } from '@/lib/date';
import type { MenuItem } from '@/types';

interface Props {
  initialRestaurant: string;
  initialItems: MenuItem[];
  initialDeadline?: string | null;
  hasDailyMenu: boolean;
  onSave: (restaurant: string, items: MenuItem[], deadlineTime: string) => void;
  onDelete: () => void;
  onEndNow: () => void;
}

// admin 菜單編輯區。以 key={date} remount 來重設表單,內部自管編輯狀態(無需 effect 同步)
export default function MenuEditor({
  initialRestaurant, initialItems, initialDeadline, hasDailyMenu, onSave, onDelete, onEndNow,
}: Props) {
  const [restaurant, setRestaurant] = useState(initialRestaurant);
  const [items, setItems] = useState<MenuItem[]>(initialItems);
  const [deadlineTime, setDeadlineTime] = useState(deadlineToTime(initialDeadline) || '10:30');
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');

  const addItem = () => {
    if (!newName.trim() || !newPrice) return;
    setItems([...items, { id: Date.now().toString(), name: newName.trim(), price: parseInt(newPrice, 10) }]);
    setNewName(''); setNewPrice('');
  };
  const removeItem = (id: string) => setItems(items.filter((i) => i.id !== id));

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
      <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
        <Store className="w-5 h-5 mr-2 text-blue-500" /> 設定當日菜單
      </h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">餐廳名稱</label>
          <input type="text" value={restaurant} onChange={(e) => setRestaurant(e.target.value)}
            placeholder="例如:美味便當店"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">品項列表</label>
          {items.length > 0 && (
            <div className="mb-4 space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-center bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                  <span className="font-medium text-gray-800">{item.name}</span>
                  <div className="flex items-center space-x-4">
                    <span className="text-gray-600">${item.price}</span>
                    <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex space-x-2">
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
              placeholder="品項名稱" onKeyDown={(e) => e.key === 'Enter' && addItem()}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
            <input type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)}
              placeholder="價格" onKeyDown={(e) => e.key === 'Enter' && addItem()}
              className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
            <button onClick={addItem} className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-lg transition-colors">
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 flex items-center">
            <Clock className="w-4 h-4 mr-1 text-blue-500" /> 結單時間
          </label>
          <input type="time" value={deadlineTime} onChange={(e) => setDeadlineTime(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          <p className="text-xs text-gray-500 mt-1">過了結單時間,員工無法再點餐、改單或取消(留空則不限制)</p>
        </div>
        <div className="pt-4 border-t border-gray-100 flex flex-wrap justify-end gap-3">
          <button onClick={onEndNow} className="px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg font-medium flex items-center transition-colors">
            <Ban className="w-4 h-4 mr-1" /> 立即結束訂單
          </button>
          {hasDailyMenu && (
            <button onClick={onDelete} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors">
              恢復預設菜單
            </button>
          )}
          <button onClick={() => onSave(restaurant, items, deadlineTime)} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center transition-colors">
            <Save className="w-4 h-4 mr-2" /> 儲存發布
          </button>
        </div>
      </div>
    </div>
  );
}
