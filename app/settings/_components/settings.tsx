'use client'

import React from 'react'
import { GeneralSettings } from '@/components/settings/general-settings'
import { useAuth } from '@/src/hooks/useAuth'

export default function SettingsComponent() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-4">
        <p>Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Account Settings</h1>
        <GeneralSettings />
      </div>
    </div>
  )
} 