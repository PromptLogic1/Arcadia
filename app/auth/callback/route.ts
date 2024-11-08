import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database.types'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
    
    try {
      await supabase.auth.exchangeCodeForSession(code)
      
      // After successful authentication, check/create profile
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user && session.user.email) {
        // Check if user profile exists
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('auth_id', session.user.id)
          .single()

        if (profileError || !profile) {
          // Create new profile if doesn't exist
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              auth_id: session.user.id,
              email: session.user.email,
              username: session.user.email.split('@')[0] || 'user',
              full_name: null,
              avatar_url: null,
              role: 'user' as const,
              experience_points: 0,
              preferred_language: null,
              last_login_at: new Date().toISOString(),
              bio: null,
              github_username: null
            })

          if (insertError) {
            console.error('Error creating profile:', insertError)
          }
        }
      }
    } catch (error) {
      console.error('Auth error:', error)
    }
  }

  // Redirect to the appropriate page
  return NextResponse.redirect(requestUrl.origin)
}