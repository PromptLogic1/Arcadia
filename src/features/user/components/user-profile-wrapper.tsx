'use client'

import React from 'react'
import UserPage from './user-page'
import { useAuth } from '@/src/hooks/useAuth'

export default function UserProfileComponent() {
  const { userData: ownUserData } = useAuth()

  // If userData is provided, we're viewing another user's profile
  // Otherwise, use the authenticated user's data from Redux
  const displayData = ownUserData

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