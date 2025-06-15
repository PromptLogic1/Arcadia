import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { logger } from '@/lib/logger';
import { generateNonce, getCSPHeader } from '@/lib/csp';
import { isSessionBlacklisted } from '@/lib/session-blacklist';

// Define paths that require authentication
const protectedPaths = [
  '/user',
  '/settings',
  '/admin',
  '/play-area',
  '/join', // Session joining requires authentication
  '/challenge-hub', // Challenge hub requires authentication for interaction
];

// Define paths that are auth-related (should redirect if already authenticated)
const authPaths = ['/auth/login', '/auth/signup', '/auth/forgot-password'];

// Define API paths that require authentication
const protectedApiPaths = [
  '/api/bingo/sessions', // Game session management
  '/api/submissions', // User submissions
  '/api/discussions', // Community discussions
];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Generate CSP nonce for this request
  const nonce = generateNonce();

  // Redirect old paths
  if (pathname.startsWith('/challengehub')) {
    const newPath = pathname.replace('/challengehub', '/challenge-hub');
    const response = NextResponse.redirect(new URL(newPath, request.url));
    response.headers.set('Content-Security-Policy', getCSPHeader(nonce));
    return response;
  }
  if (pathname.startsWith('/playarea')) {
    const newPath = pathname.replace('/playarea', '/play-area');
    const response = NextResponse.redirect(new URL(newPath, request.url));
    response.headers.set('Content-Security-Policy', getCSPHeader(nonce));
    return response;
  }

  try {
    // Validate required environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      logger.error(
        'Missing required Supabase environment variables',
        undefined,
        {
          component: 'middleware',
          metadata: {
            pathname,
            hasUrl: !!supabaseUrl,
            hasAnonKey: !!supabaseAnonKey,
          },
        }
      );
      // Return next() to prevent breaking the app, but log the error
      return NextResponse.next({ request });
    }

    // Create response and Supabase client with proper cookie handling
    let supabaseResponse = NextResponse.next({
      request: {
        ...request,
        headers: new Headers(request.headers),
      },
    });

    // Add CSP nonce to request headers so it can be accessed in components
    supabaseResponse.headers.set('x-nonce', nonce);

    // Add Content Security Policy header
    const cspHeader = getCSPHeader(nonce);
    supabaseResponse.headers.set('Content-Security-Policy', cspHeader);

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    // IMPORTANT: Do not run code between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    // IMPORTANT: DO NOT REMOVE auth.getUser()
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get session separately for blacklist checking
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Check if session is blacklisted (security feature)
    if (session?.access_token) {
      const blacklistCheck = await isSessionBlacklisted(session.access_token);
      if (blacklistCheck.isBlacklisted) {
        logger.warn('Blacklisted session detected', {
          metadata: {
            component: 'middleware',
            pathname,
            reason: blacklistCheck.reason,
            userId: user?.id,
          },
        });

        // Clear the session and redirect to login
        const response = NextResponse.redirect(
          new URL('/auth/login?reason=session_revoked', request.url)
        );
        response.headers.set('Content-Security-Policy', cspHeader);

        // Clear all auth cookies
        response.cookies.delete('sb-access-token');
        response.cookies.delete('sb-refresh-token');

        return response;
      }
    }

    // Check if the path is protected
    const isProtectedPath = protectedPaths.some(path =>
      pathname.startsWith(path)
    );
    const isProtectedApiPath = protectedApiPaths.some(path =>
      pathname.startsWith(path)
    );
    const isAuthPath = authPaths.some(path => pathname.startsWith(path));

    // Handle authentication logic
    if (!user && isProtectedPath) {
      // User is not authenticated and tries to access protected route
      const redirectUrl = new URL('/auth/login', request.nextUrl.origin);
      redirectUrl.searchParams.set('redirectedFrom', pathname);
      const response = NextResponse.redirect(redirectUrl);
      response.headers.set('Content-Security-Policy', cspHeader);
      return response;
    }

    if (!user && isProtectedApiPath) {
      // User is not authenticated and tries to access protected API route
      const response = NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
      response.headers.set('Content-Security-Policy', cspHeader);
      return response;
    }

    if (user && isAuthPath) {
      // User is authenticated and tries to access auth pages
      const redirectedFrom = request.nextUrl.searchParams.get('redirectedFrom');
      if (
        redirectedFrom &&
        !authPaths.some(path => redirectedFrom.startsWith(path))
      ) {
        const response = NextResponse.redirect(
          new URL(redirectedFrom, request.nextUrl.origin)
        );
        response.headers.set('Content-Security-Policy', cspHeader);
        return response;
      }
      // Otherwise redirect to home
      const response = NextResponse.redirect(
        new URL('/', request.nextUrl.origin)
      );
      response.headers.set('Content-Security-Policy', cspHeader);
      return response;
    }

    // IMPORTANT: You *must* return the supabaseResponse object as it is.
    // If you're creating a new response object with NextResponse.next() make sure to:
    // 1. Pass the request in it, like so:
    //    const myNewResponse = NextResponse.next({ request })
    // 2. Copy over the cookies, like so:
    //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
    // 3. Change the myNewResponse object to fit your needs, but avoid changing
    //    the cookies!
    // 4. Finally:
    //    return myNewResponse
    // If this is not done, you may be causing the browser and server to go out
    // of sync and terminate the user's session prematurely!

    return supabaseResponse;
  } catch (error) {
    logger.error('Middleware error', error, {
      component: 'middleware',
      metadata: { pathname },
    });

    // Return the original request on error to prevent breaking the app
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (svg, png, jpg, etc.)
     * Now includes protected API routes for authentication
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
    // Include protected API routes
    '/api/bingo/sessions/:path*',
    '/api/submissions/:path*',
    '/api/discussions/:path*',
  ],
};
