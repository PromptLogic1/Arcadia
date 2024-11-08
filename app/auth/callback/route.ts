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

  // Initialize Supabase client with async cookies
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient<Database>({ 
    cookies: () => cookieStore 
  })
  
  try {
    // Exchange the code for a session
    const { error: authError } = await supabase.auth.exchangeCodeForSession(code)
    if (authError) {
      console.error('Auth exchange error:', authError)
      throw new Error('Failed to exchange auth code')
    }

    // Get authenticated user data using Promise.all for parallel requests
    const [userResponse, existingUserResponse] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('users')
        .select('id')
        .eq('auth_id', (await supabase.auth.getUser()).data.user?.id || '')
        .maybeSingle()
    ])

    const { data: { user }, error: userError } = userResponse
    const { data: existingUser, error: checkError } = existingUserResponse

    if (userError || !user) {
      throw new Error('Failed to get authenticated user')
    }

    if (checkError) {
      console.error('Error checking existing user:', checkError)
      throw new Error(`Database error: ${checkError.message}`)
    }

    // Ensure required user data exists
    if (!user.email) {
      throw new Error('User email is required')
    }

    // Get user metadata
    const metadata = user.user_metadata || {}
    const username = metadata.username || user.email.split('@')[0] || 'user'

    if (!existingUser) {
      // Create new user profile
      const newUser = {
        auth_id: user.id,
        email: user.email,
        username,
        full_name: metadata.full_name as string | null,
        avatar_url: metadata.avatar_url as string | null || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}`,
        role: 'user' as const,
        experience_points: 0,
        preferred_language: null,
        github_username: null,
        bio: null,
        is_active: true,
        last_login_at: new Date().toISOString()
      } satisfies Database['public']['Tables']['users']['Insert']

      const { error: insertError } = await supabase
        .from('users')
        .insert(newUser)

      if (insertError) {
        console.error('Profile creation error:', insertError)
        throw new Error(`Failed to create profile: ${insertError.message}`)
      }

      // Use Response objects for better control
      const response = NextResponse.redirect(
        new URL('/user/user-page', requestUrl.origin)
      )
      response.headers.set('Cache-Control', 'no-store')
      return response
    }

    // Update last login for existing users using Promise
    await Promise.resolve(
      supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('auth_id', user.id)
    )

    // Use Response objects for existing users too
    const response = NextResponse.redirect(
      new URL('/dashboard', requestUrl.origin)
    )
    response.headers.set('Cache-Control', 'no-store')
    return response

  } catch (error) {
    console.error('Auth/Profile Error:', error)
    
    // Sign out on error
    await supabase.auth.signOut()

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.redirect(
      new URL(`/auth/error?error=${encodeURIComponent(errorMessage)}`, requestUrl.origin)
    )
  }
}