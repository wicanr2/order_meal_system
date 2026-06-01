// CSV 匯出純函數 — 從原型 handleExportCSV 抽出(可單元測試)

export interface OrderRow {
  empId: string;
  name: string;
  itemName: string;
  price: number;
  createdAt?: string | null;
}

// 產生帶 UTF-8 BOM 的 CSV 字串(Excel 友善),欄位用雙引號包覆
export function ordersToCsv(orders: OrderRow[]): string {
  const headers = ['工號', '姓名', '品項', '金額', '訂餐時間'];
  const rows = orders.map((o) => {
    const time = o.createdAt
      ? new Date(o.createdAt).toLocaleTimeString('zh-TW', { hour12: false })
      : '';
    return [o.empId, o.name, o.itemName, String(o.price), time];
  });
  const body = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  return '﻿' + body;
}

// 瀏覽器端觸發下載(非純函數,僅在 client 呼叫)
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
