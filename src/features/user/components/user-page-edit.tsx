'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuth, useAuthActions } from '@/src/lib/stores'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { countries } from '@/lib/data/countries'
import { logger } from '@/src/lib/logger'
import { notifications } from '@/src/lib/notifications'

export default function UserPageEdit() {
  const { userData, isAuthenticated } = useAuth()
  const { updateUserDataService } = useAuthActions()
  const router = useRouter()
  const _supabase = createClientComponentClient()

  // Form states
  const [username, setUsername] = useState(userData?.username || '')
  const [fullName, setFullName] = useState(userData?.full_name || '')
  const [bio, setBio] = useState(userData?.bio || '')
  const [land, setLand] = useState(userData?.land || '')
  const [region, setRegion] = useState(userData?.region || '')
  const [city, setCity] = useState(userData?.city || '')

  // UI states
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Move authentication check here
  if (!isAuthenticated || !userData) {
    router.push('/login')
    return null
  }

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)

    try {
      await updateUserDataService(userData.id, {
        username,
        full_name: fullName,
        bio,
        land,
        region,
        city,
      })

      setMessage({
        text: 'Profile updated successfully!',
        type: 'success'
      })
      
      router.refresh()
    } catch (error) {
      logger.error('Profile update failed', error as Error, { component: 'UserPageEdit', metadata: { userId: userData.id } })
      setMessage({
        text: error instanceof Error ? error.message : 'An error occurred while updating profile',
        type: 'error'
      })
      notifications.error('Failed to update profile', { description: error instanceof Error ? error.message : 'Please try again or contact support.' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Edit Profile</h1>
          <Button
            variant="outline"
            onClick={() => router.push('/user')}
            className="border-cyan-500/20 hover:bg-cyan-500/10"
          >
            Back to Profile
          </Button>
        </div>

        {message && (
          <div className={cn(
            "p-4 rounded-lg mb-6 flex items-start gap-2",
            message.type === 'success' ? "bg-green-500/10" : "bg-red-500/10"
          )}>
            <Info className={cn(
              "w-5 h-5",
              message.type === 'success' ? "text-green-400" : "text-red-400"
            )} />
            <p className={cn(
              "text-sm",
              message.type === 'success' ? "text-green-400" : "text-red-400"
            )}>
              {message.text}
            </p>
          </div>
        )}

        <Card className="bg-gray-800/50 border-cyan-500/20">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-gray-700/50 border-cyan-500/20"
              />
            </div>

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

        <div className="flex justify-end mt-6">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
