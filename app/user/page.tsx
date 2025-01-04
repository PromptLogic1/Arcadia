import UserProfile from './_components/user';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database.types';

export default async function UserProfilePage({ searchParams }: { searchParams: { id?: string } }) {
  // For now, we'll keep the Supabase client only for viewing other users' profiles
  const cookieStore = await cookies();
  const supabase = createServerComponentClient<Database>({ cookies: () => cookieStore });

  let userData = null;

  if (searchParams.id) {
    // Only query Supabase when viewing another user's profile
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', searchParams.id)
      .single();

    if (error || !data) {
      console.error('Error fetching user data:', error);
      return <div>Error loading user profile</div>;
    }
    userData = data;
  }

  // When no ID is provided, UserProfile will use Redux store data
  return <UserProfile userData={userData} />;
}
