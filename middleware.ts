import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/types/database.types'

export async function middleware(request: Request) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient<Database>({ req: request, res })

  // Get session
  const { data: { session } } = await supabase.auth.getSession()

  // Protected Routes
  const protectedRoutes = [
    '/user/settings',
    '/user/user-page',
    // Add other protected routes here
  ]

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(route => 
    request.url.includes(route)
  )

  if (isProtectedRoute) {
    // If no session, redirect to login
    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    // If session exists but no user profile, redirect to profile creation
    if (session) {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', session.user.id)
        .single()

      if (!profile && !request.url.includes('/user/create-profile')) {
        return NextResponse.redirect(new URL('/user/create-profile', request.url))
      }
    }
  }

  // For auth pages, redirect to home if already logged in
  const authRoutes = ['/auth/login', '/auth/signup']
  if (authRoutes.some(route => request.url.includes(route)) && session) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return res
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    '/user/:path*',
    '/challenges/:path*',
    '/auth/:path*',
    // Add other paths that need middleware protection
  ]
} 