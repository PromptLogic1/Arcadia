import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { RateLimiter } from '@/lib/rate-limiter'
import type { Database } from '@/types/database.types'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  // Early validation
  if (!code) {
    return NextResponse.redirect(`${requestUrl.origin}/auth/error?error=no_code`)
  }

  // Rate Limiting
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const rateLimiter = new RateLimiter()
  if (await rateLimiter.isLimited(ip)) {
    return NextResponse.redirect(`${requestUrl.origin}/auth/error?error=rate_limited`)
  }

  const cookieStore = cookies()
  const supabase = createRouteHandlerClient<Database>({ 
    cookies: () => cookieStore,
    options: {
      db: {
        schema: 'public'
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    }
  })
  
  try {
    // Exchange the code for a session
    const { error: authError } = await supabase.auth.exchangeCodeForSession(code)
    if (authError) {
      console.error('Auth exchange error:', authError)
      throw new Error('Failed to exchange auth code')
    }

    // Wait a short moment to ensure auth is completed
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Get the session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      console.error('Session error:', sessionError)
      throw new Error('Failed to get session')
    }
    if (!session?.user) {
      throw new Error('No user in session')
    }

    // Get user metadata
    const metadata = session.user.user_metadata || {}
    const username = metadata.username || session.user.email?.split('@')[0] || 'user'

    try {
      // Check if user already exists in the users table
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', session.user.id)
        .maybeSingle()

      if (checkError) {
        console.error('Error checking existing user:', checkError)
        throw new Error(`Database error: ${checkError.message}`)
      }

      if (!existingUser) {
        // Create new user profile with service role
        const { error: insertError } = await supabase
          .from('users')
          .insert([{
            auth_id: session.user.id,
            email: session.user.email || '',
            username: username,
            full_name: metadata.full_name || null,
            avatar_url: metadata.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}`,
            role: 'user',
            experience_points: 0,
            preferred_language: null,
            github_username: null,
            bio: null,
            is_active: true,
            last_login_at: new Date().toISOString()
          }])

        if (insertError) {
          console.error('Profile creation error:', insertError)
          throw new Error(`Failed to create profile: ${insertError.message}`)
        }

        // Redirect new users to their profile page
        return NextResponse.redirect(`${requestUrl.origin}/user/user-page`)
      }

      // Existing users go to dashboard
      return NextResponse.redirect(`${requestUrl.origin}/dashboard`)

    } catch (dbError) {
      console.error('Database operation error:', dbError)
      throw dbError
    }

  } catch (error) {
    console.error('Auth/Profile Error:', error)
    
    // Sign out on error
    try {
      await supabase.auth.signOut()
    } catch (signOutError) {
      console.error('Sign out error:', signOutError)
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/error?error=${encodeURIComponent(errorMessage)}`
    )
  }
}