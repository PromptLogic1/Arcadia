/**
 * Security Headers Utility for API Responses
 *
 * Provides standardized security headers to prevent common attacks
 * and improve overall security posture of API endpoints.
 */

/**
 * Standard security headers for API responses
 */
export const SECURITY_HEADERS = {
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // XSS Protection (for older browsers)
  'X-XSS-Protection': '1; mode=block',

  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Prevent downloading of files as executable
  'X-Download-Options': 'noopen',

  // Force HTTPS (HSTS) - 1 year max-age
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Content Security Policy for API responses
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none';",

  // Cache control for sensitive data
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
} as const;

/**
 * Additional headers for CORS-enabled endpoints
 */
export const CORS_SECURITY_HEADERS = {
  // CORS headers
  'Access-Control-Allow-Origin':
    process.env.NODE_ENV === 'production'
      ? 'https://arcadia.app' // Replace with actual domain
      : '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400', // 24 hours
  'Access-Control-Allow-Credentials': 'true',
} as const;

/**
 * Rate limiting headers
 */
export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'X-RateLimit-Policy': string;
}

/**
 * Creates rate limiting headers
 */
export function createRateLimitHeaders(
  limit: number,
  remaining: number,
  resetTime: number,
  policy?: string
): RateLimitHeaders {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': resetTime.toString(),
    'X-RateLimit-Policy': policy || 'sliding-window',
  };
}

/**
 * Adds security headers to a Response object
 */
export function addSecurityHeaders(
  response: Response,
  additionalHeaders?: Record<string, string>
): Response {
  const headers = new Headers(response.headers);

  // Add standard security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    headers.set(key, value);
  });

  // Add any additional headers
  if (additionalHeaders) {
    Object.entries(additionalHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Creates a new Response with security headers
 */
export function createSecureResponse(
  body: BodyInit | null,
  init?: ResponseInit,
  additionalHeaders?: Record<string, string>
): Response {
  const headers = new Headers(init?.headers);

  // Add standard security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    headers.set(key, value);
  });

  // Add additional headers
  if (additionalHeaders) {
    Object.entries(additionalHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });
  }

  // Ensure Content-Type is set for JSON responses
  if (typeof body === 'string' && !headers.get('Content-Type')) {
    try {
      JSON.parse(body);
      headers.set('Content-Type', 'application/json');
    } catch {
      // Not JSON, leave Content-Type as is
    }
  }

  return new Response(body, {
    ...init,
    headers,
  });
}

/**
 * Creates a secure JSON response
 */
export function createSecureJsonResponse(
  data: unknown,
  status = 200,
  additionalHeaders?: Record<string, string>
): Response {
  return createSecureResponse(
    JSON.stringify(data),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    },
    additionalHeaders
  );
}

/**
 * Creates a secure error response with structured error codes
 */
export function createSecureErrorResponse(
  error: {
    code: string;
    message: string;
    httpStatus: number;
    details?: Record<string, unknown>;
  },
  additionalHeaders?: Record<string, string>
): Response {
  return createSecureJsonResponse(
    {
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: new Date().toISOString(),
      },
    },
    error.httpStatus,
    additionalHeaders
  );
}

/**
 * Middleware wrapper to add security headers to all responses
 */
export function withSecurityHeaders<
  T extends (...args: unknown[]) => Promise<Response>,
>(handler: T): T {
  return (async (...args: unknown[]) => {
    const response = await handler(...args);
    return addSecurityHeaders(response);
  }) as T;
}

/**
 * Checks if a request origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;

  const allowedOrigins =
    process.env.NODE_ENV === 'production'
      ? [
          'https://arcadia.app',
          'https://www.arcadia.app',
          // Add other allowed production domains
        ]
      : [
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          'http://localhost:3001',
          // Add other development origins
        ];

  return allowedOrigins.includes(origin);
}

/**
 * Creates CORS headers based on request origin
 */
export function createCorsHeaders(
  requestOrigin?: string
): Record<string, string> {
  const origin =
    requestOrigin && isOriginAllowed(requestOrigin)
      ? requestOrigin
      : CORS_SECURITY_HEADERS['Access-Control-Allow-Origin'];

  return {
    ...CORS_SECURITY_HEADERS,
    'Access-Control-Allow-Origin': origin,
  };
}
