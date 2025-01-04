'use client'

import { useUserData } from '@/src/hooks/useUserData';
import UserProfile from './user';

export default function ProfileWrapper() {
  const { user, isUserLoaded } = useUserData();

  if (!isUserLoaded) {
    return <div>Loading profile...</div>;
  }

  return <UserProfile userData={user} />;
} 