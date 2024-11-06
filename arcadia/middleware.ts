import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/types/database.types'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient<Database>({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  // Handle email verification callback
  if (req.nextUrl.pathname === '/auth/callback') {
    const requestUrl = new URL(req.url)
    const code = requestUrl.searchParams.get('code')
    const next = requestUrl.searchParams.get('next') ?? '/'

    if (code) {
      // Exchange the code for a session
      await supabase.auth.exchangeCodeForSession(code)
      return NextResponse.redirect(new URL(next, req.url))
    }
  }

  // Protected routes
  const protectedPaths = [
    '/dashboard',
    '/profile',
    '/challenges/create',
    '/submissions'
  ]

  const isProtectedPath = protectedPaths.some(path => 
    req.nextUrl.pathname.startsWith(path)
  )

  // Redirect to login page if not authenticated
  if (isProtectedPath && !session) {
    const redirectUrl = new URL('/login', req.url)
    redirectUrl.searchParams.set('redirect', req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Update auth cookie header
  return res
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/challenges/:path*',
    '/submissions/:path*',
    '/api/:path*',
    '/auth/callback'
  ]
} 