import React, { useState, useEffect, useMemo } from 'react';
import { 
  Utensils, Clock, ChevronLeft, ChevronRight, Plus, Trash2, 
  CheckCircle2, AlertCircle, Users, Receipt, UserCircle, Save, LogOut,
  Store, Sun, Download // ⭐️ 新增 Download 圖標
} from 'lucide-react';

// 日期格式化工具 (YYYY-MM-DD)
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 載入動畫元件
const Spinner = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
    <p className="mt-4 text-gray-500 font-medium">載入中...</p>
  </div>
);

// 姓名設定元件 (視覺優化版)
const NameSetup = ({ onComplete }) => {
  const [empId, setEmpId] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (empId.trim() && name.trim()) {
      onComplete({ empId: empId.trim(), name: name.trim() });
    }
  };

  return (
    // 背景：採用海報的夏日藍天暖陽漸層色
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-sky-100 via-yellow-50 to-emerald-50 p-4 font-sans">
      {/* 卡片：增加大圓角、柔和深陰影與多重邊框，模擬黏土立體感 */}
      <div className="bg-white p-8 rounded-[2rem] shadow-xl max-w-md w-full text-center space-y-6 border-4 border-white ring-4 ring-yellow-100/50 relative overflow-hidden">

        {/* 卡片內部裝飾背景 */}
        <div className="absolute top-0 left-0 w-full h-28 bg-gradient-to-b from-orange-50/80 to-white -z-10 rounded-t-[2rem]"></div>

        {/* 標題圖示區：結合太陽與餐具，使用暖色調 */}
        <div className="relative w-24 h-24 mx-auto flex items-center justify-center mt-2">
           <div className="bg-gradient-to-tr from-orange-300 to-yellow-300 w-20 h-20 rounded-full flex items-center justify-center shadow-inner relative z-10 ring-4 ring-white">
             <Utensils className="text-white w-10 h-10" />
           </div>
           {/* 裝飾用的旋轉太陽 */}
           <Sun className="text-yellow-400 w-20 h-20 absolute -top-5 -right-5 animate-spin-slow opacity-60 z-0" style={{animationDuration: '12s'}}/>
        </div>

        {/* 標題與文案更新：呼應海報主題 */}
        <div>
          <h1 className="text-2xl font-extrabold text-orange-900 tracking-tight">告別酷暑：夏季專屬午餐預約</h1>
          <div className="mt-3 inline-block bg-orange-100 px-4 py-1.5 rounded-full">
             <p className="text-orange-800 font-bold text-sm flex items-center justify-center">
               <span className="bg-orange-500 text-white text-xs px-1.5 rounded-full mr-2">補助</span>
               每餐最高 NT$120，享受安心午食
             </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 mt-6">
          <div className="text-left group">
            <label className="block text-sm font-bold text-orange-900/80 mb-1 ml-2">工號</label>
            <input
              type="text"
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              placeholder="例如：T12345"
              // 輸入框：改為暖色系聚焦環與邊框
              className="w-full px-5 py-3 border-2 border-yellow-200 bg-yellow-50/30 rounded-2xl focus:ring-4 focus:ring-yellow-200 focus:border-orange-400 outline-none transition-all text-gray-700 placeholder-yellow-400/70 group-hover:border-yellow-300 shadow-sm"
              autoFocus
            />
          </div>
          <div className="text-left group">
            <label className="block text-sm font-bold text-orange-900/80 mb-1 ml-2">中文姓名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：王小明"
              className="w-full px-5 py-3 border-2 border-yellow-200 bg-yellow-50/30 rounded-2xl focus:ring-4 focus:ring-yellow-200 focus:border-orange-400 outline-none transition-all text-gray-700 placeholder-yellow-400/70 group-hover:border-yellow-300 shadow-sm"
            />
          </div>

          {/* 按鈕：暖橙色漸層，立體感設計 */}
          <button
            type="submit"
            disabled={!empId.trim() || !name.trim()}
            className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold text-lg py-3.5 px-4 rounded-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 mt-4 border-b-4 border-orange-700/20"
          >
            開始預約享補助
          </button>
        </form>
        <p className="text-xs text-orange-700/60 mt-6 font-medium">守護健康與休息時間，免去高溫外出排隊</p>
      </div>
    </div>
  );
};

export default function App() {
  const [userInfo, setUserInfo] = useState(null); // 改為儲存物件 { empId, name }
  const [loading, setLoading] = useState(true);
  
  const [currentDate, setCurrentDate] = useState(formatDate(new Date()));
  const [viewRole, setViewRole] = useState('employee'); // 'employee' 或 'admin'
  
  const [menus, setMenus] = useState({});
  const [allOrders, setAllOrders] = useState([]);
  const [toastConfig, setToastConfig] = useState(null);

  // ⭐️ 新增：定義每日預設菜單
  const DEFAULT_MENU = {
    restaurant: '國泰',
    items: [{ id: 'default-summer-meal', name: '夏季專案補助餐', price: 120 }]
  };

  // 定義管理員工號清單 (可自行增加)
  const ADMIN_IDS = ['admin', 'ADMIN', 'admin888'];

  // 用於管理員編輯菜單的暫存狀態
  const [editRestaurant, setEditRestaurant] = useState('');
  const [editItems, setEditItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');

  // 顯示提示訊息
  const showToast = (message, type = 'success') => {
    setToastConfig({ message, type });
    setTimeout(() => setToastConfig(null), 3000);
  };

  // 1. 初始化讀取 LocalStorage 的資料
  useEffect(() => {
    const savedUserInfo = localStorage.getItem('meal_app_userInfo');
    if (savedUserInfo) {
      const parsedInfo = JSON.parse(savedUserInfo);
      // 確保重新載入時判定是否為管理員
      parsedInfo.isAdmin = ADMIN_IDS.includes(parsedInfo.empId);
      setUserInfo(parsedInfo);
    }
    
    const savedMenus = localStorage.getItem('meal_app_menus');
    if (savedMenus) setMenus(JSON.parse(savedMenus));

    const savedOrders = localStorage.getItem('meal_app_orders');
    if (savedOrders) setAllOrders(JSON.parse(savedOrders));

    setLoading(false);
  }, []);

  // 當日期改變時，重置管理員的編輯表單 (若無設定，自動帶入預設菜單)
  useEffect(() => {
    const menu = menus[currentDate] || DEFAULT_MENU;
    setEditRestaurant(menu.restaurant);
    setEditItems(menu.items);
  }, [currentDate, menus]);

  const handleNameSetup = (info) => {
    // 登入時判定是否為管理員
    const isAdmin = ADMIN_IDS.includes(info.empId);
    const fullInfo = { ...info, isAdmin };
    
    setUserInfo(fullInfo);
    localStorage.setItem('meal_app_userInfo', JSON.stringify(fullInfo));
    showToast(`歡迎回來，${info.name}！${isAdmin ? '(管理員身分)' : ''}`);
  };

  const handleLogout = () => {
    setUserInfo(null);
    localStorage.removeItem('meal_app_userInfo');
    setViewRole('employee');
  };

  // 日期切換邏輯
  const changeDate = (days) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    setCurrentDate(formatDate(d));
  };
  const setToday = () => setCurrentDate(formatDate(new Date()));

  // ⭐️ 記憶體內過濾當日資料 (若無自訂菜單，則回傳預設菜單)
  const currentMenu = menus[currentDate] || DEFAULT_MENU;
  const currentOrders = useMemo(() => {
    return allOrders.filter(o => o.date === currentDate);
  }, [allOrders, currentDate]);
  
  // 找出當前使用者的當日訂單
  const myCurrentOrder = useMemo(() => {
    return userInfo ? currentOrders.find(o => o.empId === userInfo.empId) : null;
  }, [currentOrders, userInfo]);

  // 管理員：新增品項到暫存表單
  const handleAddItem = () => {
    if (!newItemName.trim() || !newItemPrice) return;
    const newItem = {
      id: Date.now().toString(),
      name: newItemName.trim(),
      price: parseInt(newItemPrice, 10)
    };
    setEditItems([...editItems, newItem]);
    setNewItemName('');
    setNewItemPrice('');
  };

  // 管理員：移除暫存表單的品項
  const handleRemoveItem = (id) => {
    setEditItems(editItems.filter(item => item.id !== id));
  };

  // 管理員：儲存菜單
  const handleSaveMenu = () => {
    if (!editRestaurant.trim() || editItems.length === 0) {
      showToast('請輸入餐廳名稱並至少加入一個品項', 'error');
      return;
    }

    const menuData = {
      restaurant: editRestaurant.trim(),
      items: editItems,
      updatedAt: new Date().toISOString(),
      updatedBy: userInfo?.name || 'Admin'
    };

    const newMenus = { ...menus, [currentDate]: menuData };
    setMenus(newMenus);
    localStorage.setItem('meal_app_menus', JSON.stringify(newMenus));
    showToast('菜單已儲存並發布！');
  };

  // 管理員：刪除菜單 (改為恢復預設菜單)
  const handleDeleteMenu = () => {
    const newMenus = { ...menus };
    delete newMenus[currentDate];
    setMenus(newMenus);
    localStorage.setItem('meal_app_menus', JSON.stringify(newMenus));
    showToast('已恢復預設菜單');
  };

  // 同仁：送出訂單
  const handleSubmitOrder = (item) => {
    const orderId = `${userInfo.empId}_${currentDate}`; // 使用工號作為唯一識別
    const newOrder = {
      id: orderId,
      date: currentDate,
      empId: userInfo.empId,
      userName: userInfo.name,
      itemId: item.id,
      itemName: item.name,
      price: item.price,
      timestamp: new Date().toISOString()
    };
    
    // 移除舊的同日訂單（如果有），加入新訂單
    const updatedOrders = [...allOrders.filter(o => o.id !== orderId), newOrder];
    setAllOrders(updatedOrders);
    localStorage.setItem('meal_app_orders', JSON.stringify(updatedOrders));
    showToast('訂單已送出！');
  };

  // 同仁：取消訂單
  const handleCancelOrder = () => {
    const orderId = `${userInfo.empId}_${currentDate}`;
    const updatedOrders = allOrders.filter(o => o.id !== orderId);
    setAllOrders(updatedOrders);
    localStorage.setItem('meal_app_orders', JSON.stringify(updatedOrders));
    showToast('訂單已取消');
  };

  // ⭐️
