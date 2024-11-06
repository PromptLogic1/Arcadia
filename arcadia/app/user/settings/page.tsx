'use client';

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import UserSettings from '@/components/user/user-settings/user-settings';
import type { Tables } from '@/types/database.types';

export default async function SettingsPage() {
  const supabase = createServerComponentClient({ cookies });
  
  // Get session and immediately check for null
  const sessionResponse = await supabase.auth.getSession();
  const session = sessionResponse.data.session;

  // If no session or no user id, redirect to login
  if (!session?.user?.id) {
    redirect('/auth/login');
    return null; // TypeScript needs this
  }

  // Now TypeScript knows session and session.user are not null
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', session.user.id)
    .single();

  // If no user data found, redirect to login
  if (!userData) {
    redirect('/auth/login');
    return null; // TypeScript needs this
  }

  // At this point we have both session and user data
  return (
    <UserSettings 
      userId={session.user.id} 
      userData={userData as Tables['users']['Row']} 
    />
  );
}