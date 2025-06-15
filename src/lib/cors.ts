import { type NextRequest, NextResponse } from 'next/server';

/**
 * CORS Configuration for API routes
 * Provides secure cross-origin resource sharing configuration
 */

interface CorsOptions {
  origin?: string | string[] | boolean;
  methods?: string[];
  allowedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

const DEFAULT_CORS_OPTIONS: CorsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://your-domain.com', // Replace with actual production domain
        'https://www.your-domain.com', // Replace with actual production domain
      ] 
    : true, // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Forwarded-For',
    'X-Real-IP',
    'Accept',
    'Origin',
    'User-Agent',
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
};

/**
 * Check if origin is allowed based on CORS configuration
 */
function isOriginAllowed(origin: string | null, allowedOrigins: string | string[] | boolean): boolean {
  if (!origin) return false;
  
  if (allowedOrigins === true) return true;
  if (allowedOrigins === false) return false;
  
  if (typeof allowedOrigins === 'string') {
    return origin === allowedOrigins;
  }
  
  if (Array.isArray(allowedOrigins)) {
    return allowedOrigins.includes(origin);
  }
  
  return false;
}

/**
 * Apply CORS headers to a response
 */
export function applyCorsHeaders(
  request: NextRequest, 
  response: NextResponse,
  options: CorsOptions = DEFAULT_CORS_OPTIONS
): NextResponse {
  const origin = request.headers.get('origin');
  
  // Handle origin
  if (options.origin !== false) {
    if (isOriginAllowed(origin, options.origin || DEFAULT_CORS_OPTIONS.origin!)) {
      response.headers.set('Access-Control-Allow-Origin', origin || '*');
    } else if (options.origin === true || process.env.NODE_ENV === 'development') {
      response.headers.set('Access-Control-Allow-Origin', '*');
    }
  }
  
  // Handle credentials
  if (options.credentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  // Handle methods
  if (options.methods) {
    response.headers.set('Access-Control-Allow-Methods', options.methods.join(', '));
  }
  
  // Handle headers
  if (options.allowedHeaders) {
    response.headers.set('Access-Control-Allow-Headers', options.allowedHeaders.join(', '));
  }
  
  // Handle max age
  if (options.maxAge) {
    response.headers.set('Access-Control-Max-Age', options.maxAge.toString());
  }
  
  return response;
}

/**
 * Handle preflight OPTIONS requests
 */
export function handleCorsPreflightRequest(
  request: NextRequest,
  options: CorsOptions = DEFAULT_CORS_OPTIONS
): NextResponse {
  const response = new NextResponse(null, { status: 200 });
  return applyCorsHeaders(request, response, options);
}

/**
 * CORS middleware wrapper for API routes
 */
export function withCors(
  handler: (request: NextRequest) => Promise<NextResponse> | NextResponse,
  options: CorsOptions = DEFAULT_CORS_OPTIONS
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Handle preflight OPTIONS request
    if (request.method === 'OPTIONS') {
      return handleCorsPreflightRequest(request, options);
    }
    
    // Process the actual request
    const response = await handler(request);
    
    // Apply CORS headers to the response
    return applyCorsHeaders(request, response, options);
  };
}

/**
 * Validate WebSocket upgrade requests origin
 */
export function validateWebSocketOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  
  if (process.env.NODE_ENV === 'development') {
    return true; // Allow all origins in development
  }
  
  // In production, check against allowed origins
  const allowedOrigins = [
    'https://your-domain.com', // Replace with actual production domain
    'https://www.your-domain.com', // Replace with actual production domain
  ];
  
  return origin ? allowedOrigins.includes(origin) : false;
}

/**
 * Get CORS configuration for specific API endpoints
 */
export function getApiCorsConfig(endpoint: string): CorsOptions {
  switch (endpoint) {
    case 'auth':
      return {
        ...DEFAULT_CORS_OPTIONS,
        credentials: true, // Auth endpoints need credentials
      };
    
    case 'realtime':
      return {
        ...DEFAULT_CORS_OPTIONS,
        methods: ['GET', 'POST', 'OPTIONS'], // WebSocket specific
      };
    
    case 'public':
      return {
        ...DEFAULT_CORS_OPTIONS,
        credentials: false, // Public endpoints don't need credentials
      };
    
    default:
      return DEFAULT_CORS_OPTIONS;
  }
}