import { createClient } from '@/lib/supabase/server';
import { decodeClaims } from '@/lib/jwt';
import type { AppClaims } from '@/lib/jwt';

// admin API 共用的呼叫者驗證:以 server session 的 is_admin claim 把關。
export async function getAdminCaller(): Promise<AppClaims | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser(); // 驗 token 有效
  if (!user) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const claims = decodeClaims(session.access_token);
  return claims.is_admin ? claims : null;
}

export async function isAdminCaller(): Promise<boolean> {
  return !!(await getAdminCaller());
}
