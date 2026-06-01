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
  emp_id: string;
  date: string;
  item_id: string;
  item_name: string;
  price: number;
  note?: string | null;
  created_at?: string | null;
  // 內嵌的 profile 名稱(supabase select 關聯)
  profiles?: { name: string } | null;
}

export interface Profile {
  emp_id: string;
  name: string;
  department?: string | null;
  is_admin: boolean;
  email?: string | null;
  active?: boolean;
  created_at?: string | null;
}
