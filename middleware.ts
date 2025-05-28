import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { logger } from '@/lib/logger';

// Define paths that require authentication
const protectedPaths = [
  '/user',
  '/settings',
  '/admin',
  '/challengehub',
  '/playarea',
];

// Define paths that are auth-related (should redirect if already authenticated)
const authPaths = ['/auth/login', '/auth/signup', '/auth/forgot-password'];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  try {
    // Create response and Supabase client with proper cookie handling
    let supabaseResponse = NextResponse.next({
      request,
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
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
      }
    );

    // IMPORTANT: Do not run code between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    // IMPORTANT: DO NOT REMOVE auth.getUser()
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Check if the path is protected
    const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
    const isAuthPath = authPaths.some(path => pathname.startsWith(path));

    // Handle authentication logic
    if (!user && isProtectedPath) {
      // User is not authenticated and tries to access protected route
      const redirectUrl = new URL('/auth/login', request.nextUrl.origin);
      redirectUrl.searchParams.set('redirectedFrom', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    if (user && isAuthPath) {
      // User is authenticated and tries to access auth pages
      const redirectedFrom = request.nextUrl.searchParams.get('redirectedFrom');
      if (redirectedFrom && !authPaths.some(path => redirectedFrom.startsWith(path))) {
        return NextResponse.redirect(new URL(redirectedFrom, request.nextUrl.origin));
      }
      // Otherwise redirect to home
      return NextResponse.redirect(new URL('/', request.nextUrl.origin));
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
     * - api routes (handled separately)
     * - public files (svg, png, jpg, etc.)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
