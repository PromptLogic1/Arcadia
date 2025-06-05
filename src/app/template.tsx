'use client';

import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import ScrollToTop from '../components/ui/ScrollToTop';
import { Providers } from '../components/providers';
import { SafeRootWrapper } from '../components/error-boundaries/SafeRootWrapper';
import { Suspense, lazy } from 'react';

// Lazy load analytics to prevent blocking
const AnalyticsWrapper = lazy(() => 
  import('../components/analytics-wrapper').then(mod => ({ 
    default: mod.AnalyticsWrapper 
  }))
);

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <SafeRootWrapper>
      <Providers>
        {/* Skip to main content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-cyan-600 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
        >
          Skip to main content
        </a>
        <Header />
        <main id="main-content" tabIndex={-1} className="pt-20">
          {children}
        </main>
        <Footer />
        <ScrollToTop />
        {/* Analytics in Suspense boundary to prevent blocking */}
        <Suspense fallback={null}>
          <AnalyticsWrapper />
        </Suspense>
      </Providers>
    </SafeRootWrapper>
  );
}