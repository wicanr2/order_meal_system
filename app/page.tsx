import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import OrderApp from '@/components/OrderApp';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return <OrderApp />;
}
