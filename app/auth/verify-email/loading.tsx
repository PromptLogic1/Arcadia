'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database.types'

export default function VerifyEmailLoading() {
  const [dots, setDots] = useState('.')
  const [attempts, setAttempts] = useState(0)
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  // Animate loading dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '.' : prev + '.')
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // Check for user profile
  useEffect(() => {
    const checkUserProfile = async () => {
      try {
        // Get current auth user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          throw new Error('Auth user not found')
        }

        // Check if user profile exists - only check essential fields
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('id, auth_id, username')
          .eq('auth_id', user.id)
          .single()

        if (profile?.id && profile.auth_id && profile.username) {
          // Profile found with all essential fields, redirect to user page
          router.push('/user/user-page')
          return
        }

        // If profile not found and we haven't exceeded max attempts
        if (attempts < 10) { // Try for 10 seconds (10 attempts * 1000ms)
          setAttempts(prev => prev + 1)
          setTimeout(checkUserProfile, 1000) // Check again in 1 second
        } else {
          // Max attempts reached, show error
          router.push('/auth/error?error=profile_creation_timeout')
        }

      } catch (error) {
        console.error('Profile check error:', error)
        router.push('/auth/error?error=verification_failed')
      }
    }

    checkUserProfile()
  }, [router, supabase, attempts])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-900">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="animate-pulse">
          <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
            Setting up your profile{dots}
          </h1>
          <p className="text-gray-400 mt-4">
            Please wait while we complete your registration
          </p>
          <div className="mt-8 space-y-2">
            <div className="h-2 bg-gray-700 rounded"></div>
            <div className="h-2 bg-gray-700 rounded w-5/6"></div>
            <div className="h-2 bg-gray-700 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    </div>
  )
}