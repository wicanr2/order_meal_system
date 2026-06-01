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

  // ⭐️ 新增：管理員匯出 CSV 功能
  const handleExportCSV = () => {
    if (currentOrders.length === 0) {
      showToast('目前沒有訂單可匯出', 'error');
      return;
    }

    // 準備 CSV 標頭
    const headers = ['工號', '姓名', '品項', '金額', '訂餐時間'];
    
    // 準備 CSV 內容列
    const csvRows = currentOrders.map(order => {
      const timeString = new Date(order.timestamp).toLocaleTimeString('zh-TW', { hour12: false });
      return [
        order.empId,
        order.userName,
        order.itemName,
        order.price,
        timeString
      ];
    });

    // 合併為 CSV 字串，並處理欄位中的逗號 (用雙引號包覆)
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // 加入 BOM (Byte Order Mark) 讓 Excel 能夠正確識別 UTF-8 中文，避免亂碼
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // 建立隱藏的下載連結並觸發點擊
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `訂餐明細_${currentDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('CSV 匯出成功！');
  };

  if (loading) return <Spinner />;
  if (!userInfo) return <NameSetup onComplete={handleNameSetup} />;

  const isToday = currentDate === formatDate(new Date());

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-10 font-sans">
      {/* 頂部導航列 */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Utensils className="text-blue-600 w-6 h-6" />
            <span className="font-bold text-gray-800 text-lg">訂餐系統</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full text-sm">
              <UserCircle className="w-4 h-4 mr-2" />
              {userInfo.name} ({userInfo.empId})
            </div>
            
            {/* 角色切換 (僅管理員可見) */}
            {userInfo.isAdmin && (
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setViewRole('employee')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    viewRole === 'employee' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  點餐
                </button>
                <button
                  onClick={() => setViewRole('admin')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    viewRole === 'admin' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  管理
                </button>
              </div>
            )}

            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="登出">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* 吐司提示 */}
      {toastConfig && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 flex items-center bg-gray-800 text-white px-4 py-3 rounded-xl shadow-lg animate-fade-in-down">
          {toastConfig.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 mr-2 text-green-400" />
          ) : (
            <AlertCircle className="w-5 h-5 mr-2 text-red-400" />
          )}
          <span>{toastConfig.message}</span>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        
        {/* 日期選擇器 */}
        <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between">
          <button 
            onClick={() => changeDate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div className="text-center flex-1">
            <h2 className="text-xl font-bold text-gray-800">
              {currentDate}
            </h2>
            <button 
              onClick={setToday}
              className={`text-sm mt-1 font-medium ${isToday ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'}`}
            >
              {isToday ? '今天' : '回到今天'}
            </button>
          </div>

          <button 
            onClick={() => changeDate(1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* 依據角色顯示不同內容 */}
        {viewRole === 'employee' ? (
          <div className="space-y-6">
            {!currentMenu ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-dashed border-gray-200">
                <Store className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700">這天還沒有設定菜單喔</h3>
                <p className="text-gray-500 mt-2">請稍後再回來看，或提醒管理員設定</p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">{currentMenu.restaurant}</h2>
                      <p className="text-gray-500 text-sm mt-1 flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        建議於 10:30 前完成點餐
                      </p>
                    </div>
                  </div>

                  {myCurrentOrder ? (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-center">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-6 h-6 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-bold text-blue-900 mb-1">您已成功點餐！</h3>
                      <p className="text-blue-700 font-medium mb-6">
                        {myCurrentOrder.itemName} <span className="text-blue-500 mx-2">|</span> ${myCurrentOrder.price}
                      </p>
                      <button
                        onClick={handleCancelOrder}
                        className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        取消 / 重新點餐
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentMenu.items.map((item) => (
                        <div 
                          key={item.id}
                          className="border border-gray-200 rounded-xl p-4 flex justify-between items-center hover:border-blue-300 hover:shadow-md transition-all group"
                        >
                          <div>
                            <h4 className="font-semibold text-gray-800">{item.name}</h4>
                            <p className="text-blue-600 font-bold mt-1">${item.price}</p>
                          </div>
                          <button
                            onClick={() => handleSubmitOrder(item)}
                            className="bg-gray-100 hover:bg-blue-600 text-gray-700 hover:text-white px-4 py-2 rounded-lg font-medium transition-colors"
                          >
                            點餐
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          /* 管理員視角 */
          <div className="space-y-6">
            
            {/* 菜單編輯區 */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <Store className="w-5 h-5 mr-2 text-blue-500" />
                設定當日菜單
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">餐廳名稱</label>
                  <input
                    type="text"
                    value={editRestaurant}
                    onChange={(e) => setEditRestaurant(e.target.value)}
                    placeholder="例如：美味便當店"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">品項列表</label>
                  
                  {editItems.length > 0 && (
                    <div className="mb-4 space-y-2">
                      {editItems.map((item) => (
                        <div key={item.id} className="flex justify-between items-center bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                          <span className="font-medium text-gray-800">{item.name}</span>
                          <div className="flex items-center space-x-4">
                            <span className="text-gray-600">${item.price}</span>
                            <button 
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-red-400 hover:text-red-600 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="品項名稱"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
                    />
                    <input
                      type="number"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      placeholder="價格"
                      className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
                    />
                    <button
                      onClick={handleAddItem}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-lg transition-colors"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end space-x-3">
                  {/* 僅當有自訂菜單時，才顯示恢復預設按鈕 */}
                  {menus[currentDate] && (
                    <button
                      onClick={handleDeleteMenu}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
                    >
                      恢復預設菜單
                    </button>
                  )}
                  <button
                    onClick={handleSaveMenu}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center transition-colors"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    儲存發布
                  </button>
                </div>
              </div>
            </div>

            {/* 訂單統計區 */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
              <div className="flex justify-between items-end mb-6">
                <h2 className="text-lg font-bold text-gray-800 flex items-center">
                  <Receipt className="w-5 h-5 mr-2 text-green-500" />
                  訂單統計
                </h2>
                <div className="text-right flex flex-col items-end">
                  <p className="text-sm text-gray-500">總金額</p>
                  <p className="text-2xl font-bold text-green-600 mb-2">
                    ${currentOrders.reduce((sum, order) => sum + order.price, 0)}
                  </p>
                  {/* ⭐️ 新增：匯出 CSV 按鈕 */}
                  {currentOrders.length > 0 && (
                    <button
                      onClick={handleExportCSV}
                      className="flex items-center text-sm bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-medium transition-colors border border-green-200"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      匯出 CSV
                    </button>
                  )}
                </div>
              </div>

              {currentOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>目前還沒有人點餐喔</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 品項統計 */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">品項總計</h3>
                    <div className="space-y-2">
                      {Object.entries(
                        currentOrders.reduce((acc, order) => {
                          if (!acc[order.itemName]) acc[order.itemName] = { count: 0, price: order.price };
                          acc[order.itemName].count += 1;
                          return acc;
                        }, {})
                      ).map(([itemName, data]) => (
                        <div key={itemName} className="flex justify-between items-center bg-gray-50 px-4 py-2 rounded-lg">
                          <div className="flex items-center">
                            <span className="font-medium text-gray-800">{itemName}</span>
                            <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">
                              x {data.count}
                            </span>
                          </div>
                          <span className="text-gray-600 font-medium">${data.price * data.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 點餐明細 */}
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
                          {currentOrders.map((order) => (
                            <tr key={order.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                              <td className="py-3 font-medium text-gray-500">{order.empId}</td>
                              <td className="py-3 font-medium text-gray-800">{order.userName}</td>
                              <td className="py-3 text-gray-600">{order.itemName}</td>
                              <td className="py-3 text-right text-gray-800 font-medium">${order.price}</td>
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
      </main>
    </div>
  );
}