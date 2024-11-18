'use client'

import { useState } from 'react'
import type { Tables } from '@/types/database.types'
import { Card, CardContent } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { Settings, User, Bell, Shield, Palette } from 'lucide-react'
import { GeneralSettings } from './user/settings/general-settings'
import { ComingSoon } from './user/settings/coming-soon'

interface UserSettingsProps {
  userId: string
  userData: Tables['users']['Row']
}

export default function UserSettings({ userId, userData }: UserSettingsProps) {
  const [activeTab, setActiveTab] = useState('general')

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ]

  const handleSettingsUpdate = () => {
    // You could add logic here to refresh user data if needed
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-transparent">
          Account Settings
        </h1>
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* Settings Navigation */}
          <Card className="w-full md:w-64 bg-gray-800/50 border-cyan-500/20">
            <nav className="p-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-4 py-3 rounded flex items-center gap-3 transition-colors ${
                    activeTab === tab.id 
                      ? 'bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </Card>

          {/* Settings Content */}
          <Card className="flex-1 bg-gray-800/50 border-cyan-500/20">
            <CardContent className="p-6">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {activeTab === 'general' && (
                  <GeneralSettings
                    userId={userId}
                    userData={userData}
                    onSettingsUpdate={handleSettingsUpdate}
                  />
                )}

                {(activeTab === 'notifications') && (
                  <ComingSoon
                    icon={tabs.find(tab => tab.id === activeTab)?.icon!}
                    title={tabs.find(tab => tab.id === activeTab)?.label!}
                  />
                )}
              </motion.div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
