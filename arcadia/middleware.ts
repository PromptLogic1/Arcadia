import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

// Definiere den Request-Typ explizit
interface CustomRequest extends Request {
  nextUrl: URL
}

export async function middleware(req: CustomRequest) {
  // Schnelle Rückgabe für statische Assets
  if (
    req.nextUrl.pathname.startsWith('/_next/') ||
    req.nextUrl.pathname.startsWith('/static/') ||
    req.nextUrl.pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Optimiere Session-Handling
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Cache die Session-Info im Response-Header
    if (session) {
      res.headers.set('x-user-id', session.user.id)
    }

    // Schnelles Redirect für geschützte Routen
    const protectedRoutes = ['/profile', '/settings']
    if (protectedRoutes.includes(req.nextUrl.pathname) && !session) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    return res
  } catch (error) {
    console.error('Middleware error:', error)
    return res
  }
}

// Optimiere die Matcher-Konfiguration
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 