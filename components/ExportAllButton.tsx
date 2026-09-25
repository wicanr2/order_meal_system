'use client';

import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { downloadCsv } from '@/lib/csv';

// 導覽列常駐的「匯出全部訂單」(admin only),見 docs/specs/0001-export-all-orders-csv.md。
// server 端 RPC 一次取回並核對筆數,前端再以 X-Export-Total 二次核對,不符不下載。

type ExportStatus = 'active' | 'cancelled' | 'all';

const STATUS_OPTIONS: { value: ExportStatus; label: string }[] = [
  { value: 'active', label: '只含有效訂單' },
  { value: 'cancelled', label: '只含已取消' },
  { value: 'all', label: '全部' },
];

interface Props {
  onResult: (message: string, type: 'success' | 'error') => void;
}

export default function ExportAllButton({ onResult }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ExportStatus>('active');
  const [exporting, setExporting] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // 點外面或按 Esc 關閉選單
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const exportAll = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/admin/orders/export?status=${status}`, { cache: 'no-store' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        onResult(json.error ?? '匯出失敗', 'error');
        return;
      }
      const expected = Number(res.headers.get('X-Export-Total'));
      const blob = await res.blob();
      // 欄位不含換行:資料列數 = 換行數(表頭後每列前置一個 \n)
      const actual = ((await blob.text()).match(/\n/g) ?? []).length;
      if (!Number.isInteger(expected) || actual !== expected) {
        onResult('匯出不完整,請重試', 'error');
        return;
      }
      if (expected === 0) { onResult('沒有符合條件的訂單', 'error'); return; }
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename\*=UTF-8''([^;]+)/);
      const filename = match ? decodeURIComponent(match[1]) : '訂餐全部明細.csv';
      downloadCsv(filename, blob);
      onResult(`已匯出 ${expected} 筆訂單`, 'success');
      setOpen(false);
    } catch {
      onResult('匯出失敗', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="匯出全部訂單"
        className="flex items-center bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold shadow-sm transition-colors"
      >
        <Download className="w-4 h-4 md:mr-1.5" />
        <span className="hidden md:inline">匯出全部訂單</span>
      </button>

      {open && (
        <div role="dialog" aria-label="匯出全部訂單"
          className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 p-4 z-20">
          <p className="text-sm font-semibold text-gray-800 mb-3">匯出全部訂單明細</p>
          <fieldset className="space-y-2 mb-4">
            <legend className="sr-only">訂單狀態</legend>
            {STATUS_OPTIONS.map((o) => (
              <label key={o.value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="radio" name="export-status" value={o.value}
                  checked={status === o.value} onChange={() => setStatus(o.value)}
                  className="accent-green-600" />
                {o.label}
              </label>
            ))}
          </fieldset>
          <button onClick={exportAll} disabled={exporting}
            className="w-full flex items-center justify-center bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <Download className="w-4 h-4 mr-1.5" />
            {exporting ? '匯出中' : '下載 CSV'}
          </button>
        </div>
      )}
    </div>
  );
}
