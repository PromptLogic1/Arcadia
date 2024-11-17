import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { Request } from 'next/server'

// Define paths that require authentication
const protectedPaths = [
  '/user/user-page',
  '/user/settings'
]

export async function middleware(req: Request) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Refresh session if expired
  const { data: { session } } = await supabase.auth.getSession()

  // Get the pathname of the request
  const pathname = req.url

  // Check if the path is public
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