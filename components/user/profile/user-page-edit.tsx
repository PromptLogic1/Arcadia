'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Tables } from '@/types/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Trophy, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { countries } from '@/lib/data/countries'

interface UserPageEditProps {
  userId: string
  userData: Tables['users']['Row']
}

type VisibilityType = 'public' | 'friends' | 'private'

export default function UserPageEdit({ userId, userData }: UserPageEditProps) {
  const [activeTab, setActiveTab] = useState('general')
  const router = useRouter()
  const supabase = createClientComponentClient()

  // General Settings States
  const [isSavingGeneral, setIsSavingGeneral] = useState(false)
  const [generalMessage, setGeneralMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [fullName, setFullName] = useState(userData.full_name || '')
  const [bio, setBio] = useState(userData.bio || '')
  const [land, setLand] = useState(userData.land || '')
  const [region, setRegion] = useState(userData.region || '')
  const [city, setCity] = useState(userData.city || '')

  // Privacy Settings States
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false)
  const [privacyMessage, setPrivacyMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [profileVisibility, setProfileVisibility] = useState(userData.profile_visibility)
  const [achievementsVisibility, setAchievementsVisibility] = useState(userData.achievements_visibility)
  const [submissionsVisibility, setSubmissionsVisibility] = useState(userData.submissions_visibility)

  const handleSaveGeneral = async () => {
    setIsSavingGeneral(true)
    setGeneralMessage(null)

    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: fullName,
          bio,
          land,
          region,
          city
        })
        .eq('id', userId)

      if (error) throw error

      setGeneralMessage({
        text: 'Profile updated successfully!',
        type: 'success'
      })
      
      router.refresh()
    } catch (error) {
      console.error('Profile update error:', error)
      setGeneralMessage({
        text: error instanceof Error ? error.message : 'An error occurred while updating profile',
        type: 'error'
      })
    } finally {
      setIsSavingGeneral(false)
    }
  }

  const handleSavePrivacy = async () => {
    setIsSavingPrivacy(true)
    setPrivacyMessage(null)

    try {
      const { error } = await supabase
        .from('users')
        .update({
          profile_visibility: profileVisibility,
          achievements_visibility: achievementsVisibility,
          submissions_visibility: submissionsVisibility
        })
        .eq('id', userId)

      if (error) throw error

      setPrivacyMessage({
        text: 'Privacy settings updated successfully!',
        type: 'success'
      })
      
      router.refresh()
    } catch (error) {
      console.error('Privacy settings update error:', error)
      setPrivacyMessage({
        text: error instanceof Error ? error.message : 'An error occurred while updating privacy settings',
        type: 'error'
      })
    } finally {
      setIsSavingPrivacy(false)
    }
  }

  const handleProfileVisibilityChange = (value: string) => {
    setProfileVisibility(value as VisibilityType)
  }

  const handleAchievementsVisibilityChange = (value: string) => {
    setAchievementsVisibility(value as VisibilityType)
  }

  const handleSubmissionsVisibilityChange = (value: string) => {
    setSubmissionsVisibility(value as VisibilityType)
  }

  const visibilityOptions = [
    { 
      value: 'public', 
      label: 'Public',
      description: 'Everyone can see this content'
    },
    { 
      value: 'friends', 
      label: 'Friends Only',
      description: 'Only your friends can access this content'
    },
    { 
      value: 'private', 
      label: 'Private',
      description: 'Only you can see this content'
    }
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Edit Profile</h1>
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="border-cyan-500/20 hover:bg-cyan-500/10"
        >
          Back to Profile
        </Button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-800/50 p-1 rounded-lg backdrop-blur-sm">
          {[
            { id: 'general', label: 'General' },
            { id: 'privacy', label: 'Privacy' },
            { id: 'achievements', label: 'Achievements' },
          ].map((tab) => (
            <Button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white'
                  : 'bg-transparent text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-3xl mx-auto">
        {activeTab === 'general' && (
          <div className="space-y-6">
            {generalMessage && (
              <div className={cn(
                "p-4 rounded-lg flex items-start gap-2",
                generalMessage.type === 'success' ? "bg-green-500/10" : "bg-red-500/10"
              )}>
                <Info className={cn(
                  "w-5 h-5",
                  generalMessage.type === 'success' ? "text-green-400" : "text-red-400"
                )} />
                <p className={cn(
                  "text-sm",
                  generalMessage.type === 'success' ? "text-green-400" : "text-red-400"
                )}>
                  {generalMessage.text}
                </p>
              </div>
            )}

            <Card className="bg-gray-800/50 border-cyan-500/20">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full-name">Full Name</Label>
                  <Input
                    id="full-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-gray-700/50 border-cyan-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="bg-gray-700/50 border-cyan-500/20 min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="land">Country</Label>
                  <Select
                    value={land}
                    onValueChange={setLand}
                  >
                    <SelectTrigger className="bg-gray-700/50 border-cyan-500/20">
                      <SelectValue placeholder="Select your country">
                        {land ? (
                          <div className="flex items-center gap-2">
                            <span>{countries.find(c => c.code === land)?.flag}</span>
                            <span>{countries.find(c => c.code === land)?.name}</span>
                          </div>
                        ) : (
                          "Select your country"
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] bg-gray-800 border-cyan-500/20">
                      {countries.map((country) => (
                        <SelectItem 
                          key={country.code} 
                          value={country.code}
                          className="text-white hover:bg-cyan-500/10 focus:bg-cyan-500/10 focus:text-white"
                        >
                          <div className="flex items-center gap-2">
                            <span>{country.flag}</span>
                            <span>{country.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="region">Region/State</Label>
                  <Input
                    id="region"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="bg-gray-700/50 border-cyan-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="bg-gray-700/50 border-cyan-500/20"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveGeneral}
                disabled={isSavingGeneral}
                className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white"
              >
                {isSavingGeneral ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="space-y-6">
            {privacyMessage && (
              <div className={cn(
                "p-4 rounded-lg flex items-start gap-2",
                privacyMessage.type === 'success' ? "bg-green-500/10" : "bg-red-500/10"
              )}>
                <Info className={cn(
                  "w-5 h-5",
                  privacyMessage.type === 'success' ? "text-green-400" : "text-red-400"
                )} />
                <p className={cn(
                  "text-sm",
                  privacyMessage.type === 'success' ? "text-green-400" : "text-red-400"
                )}>
                  {privacyMessage.text}
                </p>
              </div>
            )}

            <Card className="bg-gray-800/50 border-cyan-500/20">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label>Profile Visibility</Label>
                  <Select
                    value={profileVisibility}
                    onValueChange={handleProfileVisibilityChange}
                  >
                    <SelectTrigger className="bg-gray-700/50 border-cyan-500/20 text-white">
                      <SelectValue placeholder="Select visibility">
                        {visibilityOptions.find(opt => opt.value === profileVisibility)?.label}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border border-cyan-500/20">
                      {visibilityOptions.map(option => (
                        <SelectItem 
                          key={option.value} 
                          value={option.value}
                          className="text-white hover:bg-cyan-500/10 focus:bg-cyan-500/10 focus:text-white py-2"
                        >
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{option.label}</span>
                            <span className="text-sm text-gray-400 font-normal">{option.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Achievements Visibility</Label>
                  <Select
                    value={achievementsVisibility}
                    onValueChange={handleAchievementsVisibilityChange}
                  >
                    <SelectTrigger className="bg-gray-700/50 border-cyan-500/20 text-white">
                      <SelectValue placeholder="Select visibility">
                        {visibilityOptions.find(opt => opt.value === achievementsVisibility)?.label}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border border-cyan-500/20">
                      {visibilityOptions.map(option => (
                        <SelectItem 
                          key={option.value} 
                          value={option.value}
                          className="text-white hover:bg-cyan-500/10 focus:bg-cyan-500/10 focus:text-white py-2"
                        >
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{option.label}</span>
                            <span className="text-sm text-gray-400 font-normal">{option.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Submissions Visibility</Label>
                  <Select
                    value={submissionsVisibility}
                    onValueChange={handleSubmissionsVisibilityChange}
                  >
                    <SelectTrigger className="bg-gray-700/50 border-cyan-500/20 text-white">
                      <SelectValue placeholder="Select visibility">
                        {visibilityOptions.find(opt => opt.value === submissionsVisibility)?.label}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border border-cyan-500/20">
                      {visibilityOptions.map(option => (
                        <SelectItem 
                          key={option.value} 
                          value={option.value}
                          className="text-white hover:bg-cyan-500/10 focus:bg-cyan-500/10 focus:text-white py-2"
                        >
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{option.label}</span>
                            <span className="text-sm text-gray-400 font-normal">{option.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={handleSavePrivacy}
                disabled={isSavingPrivacy}
                className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white"
              >
                {isSavingPrivacy ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="text-center py-12">
            <Trophy className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl text-gray-400">Achievements settings coming soon...</h3>
          </div>
        )}
      </div>
    </div>
  )
}
