// 日期格式化工具 (YYYY-MM-DD) — 從原型 formatDate 抽出
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${formatDate(date)} ${hours}:${minutes}:${seconds}`;
}

// 在某 YYYY-MM-DD 上加減天數,回傳新的 YYYY-MM-DD
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

export function today(): string {
  return formatDate(new Date());
}

export function isToday(dateStr: string): boolean {
  return dateStr === today();
}

// 結單時間(HH:MM,本地)+ 日期(YYYY-MM-DD)→ timestamptz ISO;空字串視為不設截止
export function timeToDeadlineISO(dateStr: string, hhmm: string): string | null {
  if (!hhmm) return null;
  const d = new Date(`${dateStr}T${hhmm}:00`); // 以瀏覽器本地時區解析
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// deadline ISO → 本地 HH:MM(給 time input 顯示);null 回空字串
export function deadlineToTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
