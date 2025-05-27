'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { Check, User, Settings } from 'lucide-react'
import type { Database } from '@/types/database.types'
import { log } from "@/lib/logger"

export default function OAuthSuccessPage() {
  const [username, setUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/auth/login')
          return
        }

        // Fetch the username from your users table
        const { data: userData } = await supabase
          .from('users')
          .select('username')
          .eq('auth_id', session.user.id)
          .single()

        if (userData) {
          setUsername(userData.username)
        }
      } catch (error) {
        log.error('Error fetching user data after OAuth success', error, { metadata: { page: 'OAuthSuccessPage' } })
        router.push('/auth/login?error=oauth_failed')
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [supabase, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto text-center space-y-8 p-6">
      <div className="flex justify-center">
        <div className="rounded-full bg-green-500/10 p-3">
          <Check className="w-12 h-12 text-green-400" />
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
          Welcome to Arcadia!
        </h1>
        <p className="text-gray-400">
          Your account has been successfully created
        </p>
      </div>

      <div className="bg-gray-800/50 border border-cyan-500/20 rounded-lg p-6 space-y-4">
        <div className="space-y-2">
          <p className="text-gray-300">Your username is:</p>
          <p className="text-xl font-semibold text-white">
            {username}
          </p>
        </div>
        
        <div className="space-y-2">
          <p className="text-sm text-gray-400">
            You can customize your profile and change your username in the settings.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <Button
          onClick={() => router.push('/user/user-page')}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-fuchsia-500"
        >
          <User className="w-4 h-4" />
          View Your Profile
        </Button>

        <Button
          onClick={() => router.push('/user/settings')}
          variant="outline"
          className="w-full flex items-center justify-center gap-2"
        >
          <Settings className="w-4 h-4" />
          Customize Settings
        </Button>

        <Button
          onClick={() => router.push('/')}
          variant="ghost"
          className="w-full text-gray-400 hover:text-white"
        >
          Go to Homepage
        </Button>
      </div>
    </div>
  )
} 