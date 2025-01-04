'use client'

import React from 'react'
import type { Tables } from '@/types/database.types'
import UserPage from '@/components/user/user-page'
import { useAuth } from '@/src/hooks/useAuth'

interface UserProfileProps {
  userData: Tables['users']['Row'] | null // For viewing other users' profiles
}

export default function UserProfile({ userData }: UserProfileProps) {
  const { userData: ownUserData } = useAuth()

  // If userData is provided, we're viewing another user's profile
  // Otherwise, use the authenticated user's data from Redux
  const displayData = userData || ownUserData

  if (!displayData) {
    return (
      <div className="container mx-auto p-4">
        <p>Loading user data...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <UserPage userData={displayData} />
    </div>
  )
}
