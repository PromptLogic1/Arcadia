import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import UserProfile from '@/components/user-profile';

export default async function UserProfilePage() {
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

  return <UserProfile userData={userData} />;
}