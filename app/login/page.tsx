'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Utensils, Sun } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { empIdToEmail } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [empId, setEmpId] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 無密碼登入:以「工號 + 中文姓名」驗證。姓名在後端即作為帳號憑證。
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empId.trim() || !name.trim()) return;
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: empIdToEmail(empId),
      password: name.trim(),
    });
    if (error) {
      setError('工號或姓名錯誤');
      setLoading(false);
      return;
    }
    router.push('/');
    router.refresh();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-sky-100 via-yellow-50 to-emerald-50 p-4 font-sans">
      <div className="bg-white p-8 rounded-[2rem] shadow-xl max-w-md w-full text-center space-y-6 border-4 border-white ring-4 ring-yellow-100/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-28 bg-gradient-to-b from-orange-50/80 to-white -z-10 rounded-t-[2rem]"></div>

        <div className="relative w-24 h-24 mx-auto flex items-center justify-center mt-2">
          <div className="bg-gradient-to-tr from-orange-300 to-yellow-300 w-20 h-20 rounded-full flex items-center justify-center shadow-inner relative z-10 ring-4 ring-white">
            <Utensils className="text-white w-10 h-10" />
          </div>
          <Sun
            className="text-yellow-400 w-20 h-20 absolute -top-5 -right-5 opacity-60 z-0"
            style={{ animationDuration: '12s' }}
          />
        </div>

        <div>
          <h1 className="text-2xl font-extrabold text-orange-900 tracking-tight">
            告別酷暑:夏季專屬午餐預約
          </h1>
          <div className="mt-3 inline-block bg-orange-100 px-4 py-1.5 rounded-full">
            <p className="text-orange-800 font-bold text-sm flex items-center justify-center">
              <span className="bg-orange-500 text-white text-xs px-1.5 rounded-full mr-2">補助</span>
              每餐最高 NT$120,享受安心午食
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
              placeholder="例如:A200112"
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
              placeholder="例如:王小明"
              className="w-full px-5 py-3 border-2 border-yellow-200 bg-yellow-50/30 rounded-2xl focus:ring-4 focus:ring-yellow-200 focus:border-orange-400 outline-none transition-all text-gray-700 placeholder-yellow-400/70 group-hover:border-yellow-300 shadow-sm"
            />
          </div>

          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

          <button
            type="submit"
            disabled={!empId.trim() || !name.trim() || loading}
            className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold text-lg py-3.5 px-4 rounded-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 mt-4 border-b-4 border-orange-700/20"
          >
            {loading ? '登入中…' : '登入享補助'}
          </button>
        </form>
        <p className="text-xs text-orange-700/60 mt-6 font-medium">
          守護健康與休息時間,免去高溫外出排隊
        </p>
      </div>
    </div>
  );
}
