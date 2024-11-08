import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import UserSettings from '@/components/user-settings';
import type { Tables } from '@/types/database.types';

export default async function SettingsPage() {
  const supabase = createServerComponentClient({ cookies });

  const sessionResponse = await supabase.auth.getSession();
  const session = sessionResponse.data.session;

  if (!session?.user?.id) {
    redirect('/auth/login');
    return null;
  }

  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', session.user.id)
    .single();

  if (!userData) {
    redirect('/auth/login');
    return null;
  }

  return <UserSettings userId={session.user.id} userData={userData as Tables['users']['Row']} />;
}
