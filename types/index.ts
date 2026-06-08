export interface MenuItem {
  id: string;
  name: string;
  price: number;
}

export interface Menu {
  restaurant: string;
  items: MenuItem[];
  deadline?: string | null;
  isDefault?: boolean;
}

export interface OrderRecord {
  id?: string;
  account_id: string;          // 擁有鍵 = 工號|姓名
  emp_id: string;              // 工號(顯示快照)
  emp_name: string;            // 姓名(顯示快照,免 join profiles)
  date: string;
  item_id: string;
  item_name: string;
  price: number;
  status?: 'active' | 'cancelled';
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancelled_reason?: string | null;
  cancellation_history?: OrderCancellation[];
  note?: string | null;
  created_at?: string | null;
}

export interface OrderCancellation {
  at: string;
  by: string;
  reason?: string | null;
}

export interface Profile {
  account_id: string;          // 工號|姓名
  emp_id: string;
  name: string;
  department?: string | null;
  is_admin: boolean;
  email?: string | null;
  active?: boolean;
  order_count?: number;
  created_at?: string | null;
}
