import { type Metadata } from 'next';
import { Inter } from 'next/font/google';
import { headers } from 'next/headers';
import '../styles/globals.css';
import { WebVitals } from '@/components/web-vitals';
import { sanitizeCriticalCSS } from '@/lib/sanitization';
import {
  defaultMetadata,
  generateOrganizationSchema,
  generateWebsiteSchema,
  combineSchemas,
} from '@/lib/metadata';
import fs from 'fs';
import path from 'path';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
  fallback: ['system-ui', '-apple-system', 'sans-serif'],
});

export const metadata: Metadata = defaultMetadata;

// Read critical CSS at build time
let criticalCSS = '';
if (process.env.NODE_ENV === 'production') {
  try {
    criticalCSS = fs.readFileSync(
      path.join(process.cwd(), 'src/styles/critical.css'),
      'utf8'
    );
  } catch {
    // Critical CSS not found, fallback to regular loading
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get nonce from request headers
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') || '';

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Essential meta tags */}
        <meta charSet="utf-8" />

        {/* Favicon and app icons */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link rel="manifest" href="/site.webmanifest" />

        {/* Inline critical CSS for faster initial render */}
        {criticalCSS && (
          <style
            dangerouslySetInnerHTML={{
              __html: sanitizeCriticalCSS(criticalCSS),
            }}
            data-critical="true"
            nonce={nonce}
          />
        )}

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: combineSchemas(
              generateOrganizationSchema(),
              generateWebsiteSchema()
            ),
          }}
        />

        {/* Preconnect to critical domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://cnotiupdqbdxxxjrcqvb.supabase.co"
        />
        <link
          rel="dns-prefetch"
          href="https://o4509444949934080.ingest.de.sentry.io"
        />

        {/* Removed prefetch links that cause issues with protected routes */}
      </head>
      <body className={inter.className}>
        {/* Skip Navigation Links for Accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-cyan-500 focus:px-4 focus:py-2 focus:text-white focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
        >
          Skip to main content
        </a>
        <a
          href="#main-navigation"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-cyan-500 focus:px-4 focus:py-2 focus:text-white focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900 focus:outline-none"
        >
          Skip to navigation
        </a>
        <WebVitals />
        {children}
      </body>
    </html>
  );
}
