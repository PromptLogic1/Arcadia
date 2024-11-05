'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { Github, Mail } from 'lucide-react'
import type { Database } from '@/types/database.types'

export function OAuthButtons() {
  const supabase = createClientComponentClient<Database>()

  const handleGithubLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
        scopes: 'read:user user:email'
      }
    })
  }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Button 
        variant="outline" 
        onClick={handleGithubLogin}
        className="flex items-center gap-2"
      >
        <Github className="w-5 h-5" />
        Continue with GitHub
      </Button>
      <Button 
        variant="outline" 
        onClick={handleGoogleLogin}
        className="flex items-center gap-2"
      >
        <Mail className="w-5 h-5" />
        Continue with Google
      </Button>
    </div>
  )
} 