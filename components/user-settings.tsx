'use client'

import React from 'react'
import type { Tables } from '@/types/database.types'
import UserSettingsComponent from './user/user-settings'

interface UserSettingsProps {
  userId: string
  userData: Tables['users']['Row']
}

export default function UserSettings({ userId, userData }: UserSettingsProps) {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <UserSettingsComponent 
        userId={userId}
        userData={userData}
      />
    </div>
  )
}
