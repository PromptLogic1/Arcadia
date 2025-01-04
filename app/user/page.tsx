import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database.types';
import ProfileWrapper from './_components/profile-wrapper';
import UserProfile from './_components/user';

export default async function UserProfilePage({ searchParams }: { searchParams: { id?: string } }) {
  // If we have an ID in the URL, fetch that specific user's profile
  if (searchParams.id) {
    const cookieStore = await cookies();
    const supabase = createServerComponentClient<Database>({ cookies: () => cookieStore });

    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', searchParams.id)
      .single();

    if (error || !userData) {
      console.error('Error fetching user data:', error);
      return <div>Error loading user profile</div>;
    }

    return <UserProfile userData={userData} />;
  }

  // If no ID is provided, use the ProfileWrapper to load the current user's data from Redux
  return <ProfileWrapper />;
}
