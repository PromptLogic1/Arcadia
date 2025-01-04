import UserProfile from './_components/user';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database.types';

export default async function UserProfilePage({ searchParams }: { searchParams: { id?: string } }) {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient<Database>({ cookies: () => cookieStore });

  let userData = null;

  if (searchParams.id) {
    // Case 1: SearchParams is provided (View another user's profile)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', searchParams.id)
      .single();

    if (error || !data) {
      console.error('Error fetching user data:', error);
      return <div>Error loading user profile</div>;
    }
     // Case 2: No SearchParams provided, call own profile. 
    userData = data; // TODO Here Add the userdata from own profile out of the service 
  }

  return <UserProfile userData={userData} />;
}
