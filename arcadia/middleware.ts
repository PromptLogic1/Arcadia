import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from '@/types/database.types'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient<Database>({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  // Geschützte Routen
  const protectedPaths = [
    '/dashboard',
    '/profile',
    '/challenges/create',
    '/submissions'
  ]

  const isProtectedPath = protectedPaths.some(path => 
    req.nextUrl.pathname.startsWith(path)
  )

  // Weiterleitung zur Login-Seite, wenn nicht authentifiziert
  if (isProtectedPath && !session) {
    const redirectUrl = new URL('/login', req.url)
    redirectUrl.searchParams.set('redirect', req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Aktualisiere die Auth-Cookie-Header
  return res
}

// Konfiguriere, auf welchen Pfaden die Middleware ausgeführt werden soll
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