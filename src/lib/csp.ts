import crypto from 'crypto';

/**
 * Generates a random nonce for Content Security Policy
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

/**
 * Gets Content Security Policy directives
 * @param nonce - The nonce to use for inline scripts
 */
export function getCSPDirectives(nonce: string): string {
  const isDevelopment = process.env.NODE_ENV === 'development';

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      // Supabase
      'https://*.supabase.co',
      'https://*.supabase.com',
      // Sentry
      'https://*.sentry.io',
      'https://*.ingest.sentry.io',
      // Google Analytics (if used)
      'https://www.googletagmanager.com',
      'https://www.google-analytics.com',
      // Development only
      ...(isDevelopment ? ["'unsafe-eval'"] : []),
    ],
    'style-src': [
      "'self'",
      // Required for Tailwind CSS and inline styles
      "'unsafe-inline'",
      // Google Fonts
      'https://fonts.googleapis.com',
    ],
    'font-src': [
      "'self'",
      // Google Fonts
      'https://fonts.gstatic.com',
      // Local fonts
      'data:',
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      // Supabase Storage
      'https://*.supabase.co',
      'https://*.supabase.com',
      // External image sources from next.config.ts
      'https://github.com',
      'https://avatars.githubusercontent.com',
      'https://raw.githubusercontent.com',
      'https://images.unsplash.com',
      'https://source.unsplash.com',
      'https://picsum.photos',
      'https://via.placeholder.com',
      'https://placekitten.com',
      'https://randomuser.me',
      'https://ui-avatars.com',
      'https://cdn.discordapp.com',
      'https://i.pravatar.cc',
      'https://placehold.it',
      'https://dummyimage.com',
      // Development
      ...(isDevelopment
        ? ['http://localhost:*', 'http://127.0.0.1:*', 'http://172.28.112.1:*']
        : []),
    ],
    'connect-src': [
      "'self'",
      // Supabase
      'https://*.supabase.co',
      'https://*.supabase.com',
      'wss://*.supabase.co',
      'wss://*.supabase.com',
      // Sentry
      'https://*.sentry.io',
      'https://*.ingest.sentry.io',
      // Upstash Redis
      'https://*.upstash.io',
      // Google Analytics
      'https://www.google-analytics.com',
      // Development
      ...(isDevelopment
        ? [
            'http://localhost:*',
            'ws://localhost:*',
            'http://127.0.0.1:*',
            'ws://127.0.0.1:*',
          ]
        : []),
    ],
    'media-src': ["'self'", 'blob:', 'data:'],
    'object-src': ["'none'"],
    'child-src': ["'self'", 'blob:'],
    'frame-src': [
      "'self'",
      // OAuth providers
      'https://*.supabase.co',
      'https://*.supabase.com',
      'https://accounts.google.com',
      'https://github.com',
    ],
    'frame-ancestors': ["'none'"],
    'form-action': ["'self'"],
    'base-uri': ["'self'"],
    'manifest-src': ["'self'"],
    'worker-src': ["'self'", 'blob:'],
    'upgrade-insecure-requests': isDevelopment ? [] : [''],
  };

  // Remove empty arrays and join with spaces
  return Object.entries(directives)
    .filter(([, values]) => values.length > 0)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
}

/**
 * Gets the complete Content Security Policy header value
 * @param nonce - The nonce to use for inline scripts
 */
export function getCSPHeader(nonce: string): string {
  return getCSPDirectives(nonce);
}
