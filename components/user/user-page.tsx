'use client'

import { useState } from 'react'
import type { Tables } from '@/types/database.types'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Trophy, GamepadIcon, Star, Clock, Calendar, MapPin } from 'lucide-react'
import NeonBorder from '@/components/ui/NeonBorder'
import NeonText from '@/components/ui/NeonText'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface UserPageProps {
  userData?: Tables['users']['Row']
}

export default function UserPage({ userData }: UserPageProps) {
  const [activeTab, setActiveTab] = useState('overview')

  if (!userData) {
    return (
      <div className="container mx-auto p-4">
        <p>Loading user data...</p>
      </div>
    )
  }

  // Generate avatar URL based on username if no avatar_url exists
  const avatarUrl = userData.avatar_url || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.username)}&background=random`

  const stats = [
    { 
      icon: Trophy, 
      label: 'Experience', 
      value: `${userData.experience_points} XP`,
      color: 'from-yellow-500 to-orange-500'
    },
    { 
      icon: MapPin, 
      label: 'Location', 
      value: [userData.city, userData.region, userData.land].filter(Boolean).join(', ') || 'Not set',
      color: 'from-cyan-500 to-blue-500'
    },
    { 
      icon: Calendar, 
      label: 'Member Since', 
      value: new Date(userData.created_at).toLocaleDateString(),
      color: 'from-green-500 to-emerald-500'
    },
    { 
      icon: Clock, 
      label: 'Last Active', 
      value: userData.last_login_at ? new Date(userData.last_login_at).toLocaleDateString() : 'Never',
      color: 'from-purple-500 to-pink-500'
    },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-center gap-8"
        >
          <NeonBorder color="cyan" className="rounded-full p-1">
            <div className="relative w-32 h-32 rounded-full overflow-hidden">
              <Image
                src={avatarUrl}
                alt={userData.username}
                fill
                className="object-cover"
                unoptimized={avatarUrl.includes('ui-avatars.com')}
              />
            </div>
          </NeonBorder>

          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl font-bold mb-2">
              <NeonText>{userData.username}</NeonText>
            </h1>
            <h2 className="text-2xl text-cyan-400 mb-4">{userData.full_name}</h2>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <span className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full text-white">
                {userData.role || 'Member'}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-gray-800/50 border-cyan-500/20 hover:border-cyan-500/40 transition-colors">
              <CardContent className="p-6">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${stat.color} flex items-center justify-center mb-4`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-400 mb-1">{stat.label}</h3>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-800/50 p-1 rounded-lg backdrop-blur-sm">
          {['overview', 'achievements', 'submissions'].map((tab) => (
            <Button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`capitalize px-6 transition-all duration-300 ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white'
                  : 'bg-transparent text-gray-400 hover:text-white'
              }`}
            >
              {tab}
            </Button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <Card className="bg-gray-800/50 border-cyan-500/20">
        <CardContent className="p-6">
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div>
                <h3 className="text-2xl font-bold mb-4">
                  <NeonText>About Me</NeonText>
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  {userData.bio || 'No bio provided yet.'}
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === 'achievements' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Star className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl text-gray-400">Achievements coming soon...</h3>
            </motion.div>
          )}

          {activeTab === 'submissions' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <GamepadIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl text-gray-400">Submissions history coming soon...</h3>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
