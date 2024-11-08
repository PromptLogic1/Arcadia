'use client'

import { useState } from 'react'
import type { Tables } from '@/types/database.types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { motion } from 'framer-motion'
import { Settings, User, Bell, Shield, Palette } from 'lucide-react'

interface UserSettingsProps {
  userId: string
  userData: Tables['users']['Row']
}

export default function UserSettings({ userId, userData }: UserSettingsProps) {
  const [activeTab, setActiveTab] = useState('general')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    // Implement save functionality
    setTimeout(() => setIsSaving(false), 1000)
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ]

  return (
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
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      defaultValue={userData.username}
                      className="bg-gray-700/50 border-cyan-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      defaultValue={userData.email}
                      className="bg-gray-700/50 border-cyan-500/20"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="full-name">Full Name</Label>
                    <Input
                      id="full-name"
                      defaultValue={userData.full_name || ''}
                      className="bg-gray-700/50 border-cyan-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      defaultValue={userData.bio || ''}
                      className="bg-gray-700/50 border-cyan-500/20 min-h-[100px]"
                    />
                  </div>
                </div>
              )}

              {(activeTab === 'notifications' || activeTab === 'privacy' || activeTab === 'appearance') && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gray-700/50 flex items-center justify-center mx-auto mb-4">
                    {tabs.find(tab => tab.id === activeTab)?.icon({ className: "h-8 w-8 text-gray-400" })}
                  </div>
                  <h3 className="text-xl text-gray-400">
                    {tabs.find(tab => tab.id === activeTab)?.label} settings coming soon...
                  </h3>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-gray-700/50 flex justify-between items-center">
                <p className="text-sm text-gray-400">
                  User ID: {userId}
                </p>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </motion.div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
