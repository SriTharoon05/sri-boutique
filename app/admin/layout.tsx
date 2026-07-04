import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function checkAdminRole() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/auth/login?redirectTo=/admin');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'admin') {
    return redirect('/');
  }

  return { user, profile };
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await checkAdminRole();

  return <>{children}</>;
}
