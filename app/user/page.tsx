import { redirect } from 'next/navigation'
import UserProfile from './_components/user'
import { store } from '@/src/store'

export default function UserProfilePage() {
  const { auth: { user }, user: { profile } } = store.getState()

  if (!user || !profile) {
    redirect('/login')
  }

  return <UserProfile userData={profile} />
} 