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
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database>({ 
      cookies: () => cookieStore 
    })
    
    // Exchange the code for a session
    const { data: { session }, error: sessionError } = 
      await supabase.auth.exchangeCodeForSession(code)

    if (sessionError || !session?.user || !session.user.email) {
      console.error('Session error:', sessionError || 'No user or email found')
      return NextResponse.redirect(new URL('/signup-error', request.url))
    }

    // Wait briefly for auth session to establish
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Check if profile exists (by email or auth_id)
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('users')
      .select('id')
      .or(`auth_id.eq.${session.user.id},email.eq.${session.user.email}`)
      .single()

    if (profileCheckError && profileCheckError.code !== 'PGRST116') {
      console.error('Profile check error:', profileCheckError)
      return NextResponse.redirect(new URL('/signup-error', request.url))
    }

    if (existingProfile) {
      // If profile exists, just update the auth_id
      const { error: updateError } = await supabase
        .from('users')
        .update({ auth_id: session.user.id })
        .eq('email', session.user.email)

      if (updateError) {
        console.error('Profile update error:', updateError)
        return NextResponse.redirect(new URL('/signup-error', request.url))
      }

      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Create profile only if pendingProfile is in metadata
    const metadata = session.user.user_metadata
    if (metadata?.pendingProfile) {
      try {
        const { error: insertError } = await supabase
          .from('users')
          .upsert({
            auth_id: session.user.id,
            email: session.user.email,
            username: metadata.username,
            full_name: metadata.full_name || null,
            avatar_url: metadata.avatar_url || null,
            role: 'user',
            experience_points: 0,
            preferred_language: null,
            github_username: null,
            bio: null,
            is_active: true,
            last_login_at: new Date().toISOString()
          }, {
            onConflict: 'email',
            ignoreDuplicates: false
          })

        if (insertError) {
          console.error('Profile creation error:', insertError)
          throw insertError
        }

        // Remove pendingProfile flag
        await supabase.auth.updateUser({
          data: { pendingProfile: false }
        })

      } catch (error) {
        console.error('Failed to create profile:', error)
        return NextResponse.redirect(new URL('/signup-error', request.url))
      }
    }

    // Successful redirect
    return NextResponse.redirect(new URL('/dashboard', request.url))

  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.redirect(new URL('/signup-error', request.url))
  }
}