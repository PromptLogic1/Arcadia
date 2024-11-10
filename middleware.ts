import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define paths that should be accessible without authentication
const publicPaths = [
  '/',
  '/auth/login',
  '/auth/signup',
  '/auth/callback',
  '/auth/error',
  '/about',
  '/api/auth/callback'
]

// Define paths that require authentication
const protectedPaths = [
  '/user/user-page',
  '/user/settings'
]

export async function middleware(req: Request) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Refresh session if expired
  const { data: { session }, error } = await supabase.auth.getSession()

  // Get the pathname of the request
  const pathname = req.url

  // Check if the path is public
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

  // Handle authentication states
  if (!session && isProtectedPath) {
    // If user is not authenticated and tries to access protected route,
    // redirect to login page
    const redirectUrl = new URL('/login', req.url)
    redirectUrl.searchParams.set('redirectedFrom', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (session && (pathname === '/login' || pathname === '/signup')) {
    // If user is authenticated and tries to access login/signup pages,
    // redirect to dashboard or home
    return NextResponse.redirect(new URL('/', req.url))
  }

  return res
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public assets)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}