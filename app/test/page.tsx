import { createAdminClient } from '@/lib/supabase/admin';

// M2 連線驗證頁(server-side,service-role 繞過 RLS 以證明端到端連線)
export const dynamic = 'force-dynamic';

export default async function TestPage() {
  const supabase = createAdminClient();
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('emp_id, name, department, is_admin')
    .order('emp_id');

  return (
    <main className="mx-auto max-w-2xl p-8 font-sans">
      <h1 className="mb-4 text-2xl font-bold">M2 連線測試</h1>
      {error ? (
        <p className="text-red-600">連線錯誤:{error.message}</p>
      ) : (
        <>
          <p className="mb-3 text-green-700">
            ✅ 已連上本機 Supabase,讀到 {profiles?.length ?? 0} 筆 profile
          </p>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">工號</th>
                <th>姓名</th>
                <th>部門</th>
                <th>管理員</th>
              </tr>
            </thead>
            <tbody>
              {profiles?.map((p) => (
                <tr key={p.emp_id} className="border-b">
                  <td className="py-2">{p.emp_id}</td>
                  <td>{p.name}</td>
                  <td>{p.department ?? '—'}</td>
                  <td>{p.is_admin ? '✔' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </main>
  );
}
