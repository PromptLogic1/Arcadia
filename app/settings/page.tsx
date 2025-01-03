import { redirect } from 'next/navigation'
import UserSettings from './_components/user-settings'
import { store } from '@/src/store'

export default function SettingsPage() {
  const { auth: { user }, user: { profile } } = store.getState()

  if (!user || !profile) {
    redirect('/login')
  }

  return <UserSettings userId={user.id} userData={profile} />
} 