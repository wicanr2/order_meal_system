// CSV 匯出純函數 — 從原型 handleExportCSV 抽出(可單元測試)
import { formatDateTime } from '@/lib/date';

export interface OrderRow {
  date?: string;
  orderSerial?: string | null;
  empId: string;
  name: string;
  itemName: string;
  price: number;
  status?: 'active' | 'cancelled';
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  createdAt?: string | null;
}

// 產生帶 UTF-8 BOM 的 CSV 字串(Excel 友善),欄位用雙引號包覆
export function ordersToCsv(orders: OrderRow[]): string {
  const includeDate = orders.some((o) => o.date);
  const headers = [
    ...(includeDate ? ['日期'] : []),
    '序號',
    '工號',
    '姓名',
    '品項',
    '金額',
    '狀態',
    '訂餐時間',
    '取消時間',
    '取消者',
  ];
  const rows = orders.map((o) => {
    const time = formatDateTime(o.createdAt);
    const cancelledTime = o.cancelledAt
      ? new Date(o.cancelledAt).toLocaleString('zh-TW', { hour12: false })
      : '';
    return [
      ...(includeDate ? [o.date ?? ''] : []),
      o.orderSerial ?? '',
      o.empId,
      o.name,
      o.itemName,
      String(o.price),
      o.status === 'cancelled' ? '已取消' : '有效',
      time,
      cancelledTime,
      o.cancelledBy ?? '',
    ];
  });
  const body = [headers, ...rows].map(csvLine).join('\n');
  return CSV_BOM + body;
}

export const CSV_BOM = '\uFEFF';

// 一列轉 CSV 行:每格雙引號包覆,內含雙引號跳脫為兩個
export function csvLine(cells: ReadonlyArray<string | number | null | undefined>): string {
  return cells.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',');
}

// 全部訂單匯出(export_orders RPC)的一列,欄位順序與 SQL jsonb_build_array 一致
export type ExportOrderRow = [
  date: string,
  restaurant: string,
  orderSerial: string | null,
  empId: string,
  empName: string,
  itemName: string,
  price: number,
  status: string,
  createdAt: string | null,
  cancelledAt: string | null,
  cancelledBy: string | null,
];

export const EXPORT_HEADERS = [
  '日期', '餐廳', '序號', '工號', '姓名', '品項', '金額', '狀態', '訂餐時間', '取消時間', '取消者',
] as const;

export function exportRowToCsvLine(row: ExportOrderRow): string {
  const [date, restaurant, serial, empId, empName, itemName, price, status, createdAt, cancelledAt, cancelledBy] = row;
  return csvLine([
    date, restaurant, serial, empId, empName, itemName, price,
    status === 'cancelled' ? '已取消' : '有效',
    createdAt, cancelledAt, cancelledBy,
  ]);
}

// 瀏覽器端觸發下載(非純函數,僅在 client 呼叫)
export function downloadCsv(filename: string, csv: string | Blob): void {
  const blob = typeof csv === 'string' ? new Blob([csv], { type: 'text/csv;charset=utf-8;' }) : csv;
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
