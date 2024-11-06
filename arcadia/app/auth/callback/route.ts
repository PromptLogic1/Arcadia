import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database.types'
import type { Tables } from '@/types/database.types'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  if (!code) {
    console.error('No code provided in callback')
    return NextResponse.redirect(new URL('/signup-error', request.url))
  }

  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database>({ 
      cookies: () => cookieStore 
    })
    
    const { data: { session }, error: sessionError } = 
      await supabase.auth.exchangeCodeForSession(code)

    if (sessionError || !session?.user) {
      console.error('Session error:', sessionError || 'No user found')
      return NextResponse.redirect(new URL('/signup-error', request.url))
    }

    console.log('User metadata:', session.user.user_metadata)
    
    const { data: existingProfile } = await supabase
      .from('users')
      .select('username')
      .eq('auth_id', session.user.id)
      .single()

    if (existingProfile) {
      console.log('Profile already exists')
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    const metadata = session.user.user_metadata
    
    if (metadata?.pendingProfile) {
      const newUserProfile = {
        auth_id: session.user.id,
        email: session.user.email!,
        username: metadata.username as string,
        full_name: metadata.full_name as string | null,
        avatar_url: metadata.avatar_url as string | null,
        role: 'user' as const,
        experience_points: 0,
        preferred_language: null,
        github_username: null,
        bio: null,
        is_active: true,
        last_login_at: new Date().toISOString()
      } satisfies Tables['users']['Insert']

      const { error: profileError } = await supabase
        .from('users')
        .insert([newUserProfile])

      if (profileError) {
        console.error('Profile creation error:', profileError)
        return NextResponse.redirect(new URL('/signup-error', request.url))
      }

      await supabase.auth.updateUser({
        data: { pendingProfile: false }
      })

      console.log('Profile created successfully')
    }

    return NextResponse.redirect(new URL('/dashboard', request.url))
  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.redirect(new URL('/signup-error', request.url))
  }
}