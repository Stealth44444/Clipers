import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const WORKSPACE_BY_ROLE: Record<string, string> = { admin: '/admin', brand: '/brand', creator: '/creator' };

/** Signed-in people go to their workspace (middleware sends them on to onboarding if it isn't done); others sign in. */
export default async function AppHomePage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  redirect(WORKSPACE_BY_ROLE[profile?.role ?? ''] ?? '/login');
}
