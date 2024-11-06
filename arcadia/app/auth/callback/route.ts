import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database.types'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  if (!code) {
    console.error('No code provided in callback')
    return NextResponse.redirect(new URL('/signup-error', request.url))
  }

  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Exchange code for session
    const { data: { session }, error: sessionError } = 
      await supabase.auth.exchangeCodeForSession(code)

    if (sessionError) {
      console.error('Session error:', sessionError)
      return NextResponse.redirect(new URL('/signup-error', request.url))
    }

    if (!session?.user) {
      console.error('No session or user found')
      return NextResponse.redirect(new URL('/signup-error', request.url))
    }

    // Log the user metadata for debugging
    console.log('User metadata:', session.user.user_metadata)
    
    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', session.user.id)
      .single()

    if (existingProfile) {
      console.log('Profile already exists')
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Get metadata from the raw_user_meta_data we can see in your JSON
    const metadata = session.user.user_metadata
    
    if (metadata?.pendingProfile) {
      console.log('Creating profile for user:', {
        id: session.user.id,
        email: session.user.email,
        username: metadata.username
      })

      // Create user profile
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: session.user.id,
          auth_id: session.user.id,
          email: session.user.email!,
          username: metadata.username,
          role: 'user',
          experience_points: 0,
          is_active: true
        })

      if (profileError) {
        console.error('Profile creation error:', profileError)
        return NextResponse.redirect(new URL('/signup-error', request.url))
      }

      // Remove the pendingProfile flag
      await supabase.auth.updateUser({
        data: { pendingProfile: false }
      })

      console.log('Profile created successfully')
    } else {
      console.log('No pending profile flag found in metadata')
    }

    return NextResponse.redirect(new URL('/dashboard', request.url))
  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.redirect(new URL('/signup-error', request.url))
  }
} 