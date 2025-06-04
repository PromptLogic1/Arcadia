import { createBrowserClient, createServerClient } from '@supabase/ssr';
import type { Database } from '../../types/database-generated';

// Type definitions for cookie handling (kept for future use)
interface _CookieOptions {
  maxAge?: number;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

interface RequestWithCookies extends Request {
  cookies: {
    getAll(): Array<{ name: string; value: string }>;
    set(name: string, value: string): void;
  };
}

// Supabase configuration - these are validated below, so non-null assertions are safe
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const _supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validation function that runs at module load
const validateConfig = () => {
  const isServer = typeof window === 'undefined';
  const missing: string[] = [];

  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  if (missing.length > 0) {
    const context = isServer ? 'server' : 'browser';
    const error = `Missing required environment variables in ${context} context: ${missing.join(', ')}`;

    // Log error but don't throw - this allows the app to still load
    console.error(error);
    console.error(
      'Available env vars:',
      Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_'))
    );

    return { error, isValid: false };
  }

  return { isValid: true };
};

// Validate configuration on module load
const configValidation = validateConfig();

// Singleton instance for browser client to improve performance
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

// 🧼 Browser Client (Client Components)
export function createClient() {
  if (!configValidation.isValid) {
    throw new Error(configValidation.error || 'Invalid Supabase configuration');
  }

  // Return singleton instance for better connection reuse
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  }

  return browserClient;
}

// 🧼 Server Client (Server Components, Route Handlers, Server Actions)
export async function createServerComponentClient() {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();

  if (!configValidation.isValid) {
    throw new Error(configValidation.error || 'Invalid Supabase configuration');
  }

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: unknown) {
        try {
          (
            cookiesToSet as Array<{
              name: string;
              value: string;
              options?: unknown;
            }>
          ).forEach(({ name, value, options }) =>
            cookieStore.set(
              name,
              value,
              options as Parameters<typeof cookieStore.set>[2]
            )
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}

// Type exports for convenience
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];

export type Functions<T extends keyof Database['public']['Functions']> =
  Database['public']['Functions'][T];

// 🧼 Utility functions for server-side auth
export const getUser = async () => {
  const supabase = await createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
};

export const getSession = async () => {
  const supabase = await createServerComponentClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
};

// 🧼 Error handling utilities
export class SupabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: string
  ) {
    super(message);
    this.name = 'SupabaseError';
  }
}

export const handleSupabaseError = (error: unknown): never => {
  if (error && typeof error === 'object' && 'message' in error) {
    const supabaseError = error as {
      message: string;
      code?: string;
      details?: string;
    };
    throw new SupabaseError(
      supabaseError.message,
      supabaseError.code,
      supabaseError.details
    );
  }
  throw new Error('An unknown error occurred');
};

export const isSupabaseError = (error: unknown): error is SupabaseError => {
  return error instanceof SupabaseError;
};

export const isAuthError = (error: unknown): boolean => {
  return isSupabaseError(error) && error.code?.startsWith('auth') === true;
};

// Feature flags
export const features = {
  enableRealtime: process.env.NEXT_PUBLIC_ENABLE_REALTIME === 'true',
  enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  debugMode: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
} as const;

// 🧼 Middleware Utility for Session Management
export async function updateSession(request: Request) {
  const { NextResponse } = await import('next/server');

  let supabaseResponse = NextResponse.next({
    request,
  });

  if (!configValidation.isValid) {
    throw new Error(configValidation.error || 'Invalid Supabase configuration');
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return (request as RequestWithCookies).cookies.getAll();
      },
      setAll(cookiesToSet: unknown) {
        (
          cookiesToSet as Array<{
            name: string;
            value: string;
            options?: unknown;
          }>
        ).forEach(({ name, value }) =>
          (request as RequestWithCookies).cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        (
          cookiesToSet as Array<{
            name: string;
            value: string;
            options?: unknown;
          }>
        ).forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(
            name,
            value,
            options as Parameters<typeof supabaseResponse.cookies.set>[2]
          )
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

  // Assign to underscore-prefixed variable to indicate it's intentionally unused
  const _user = user;

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
}
