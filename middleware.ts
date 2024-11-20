import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { Request } from 'next/server'

// Define paths that require authentication
const protectedPaths = [
  '/user/*'
]

// Define paths that are public but require special handling
const authPaths = [
  '/login',
  '/signup',
  '/auth/oauth-success'
]

export async function middleware(req: Request) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Refresh session if expired
  const { data: { session } } = await supabase.auth.getSession()

  // Get the pathname of the request
  const pathname = req.url

  // Check if the path is protected
  const isProtectedPath = protectedPaths.some(path => {
    if (path.endsWith('/*')) {
      // For wildcard paths, check if the pathname starts with the base path
      const basePath = path.slice(0, -2) // Remove '/*'
      return pathname.startsWith(basePath)
    }
    // For exact paths, check for exact match
    return pathname === path
  })

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