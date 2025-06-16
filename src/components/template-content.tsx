'use client';

import Header from './layout/Header';
import Footer from './layout/Footer';
import ScrollToTop from './ui/ScrollToTop';
import { ThemeWrapper } from './theme-wrapper';
import { ServiceWorkerRegistration } from './ServiceWorkerRegistration';
import { AccessibilityEnhancements } from './accessibility/AccessibilityEnhancements';
import { Suspense, lazy } from 'react';

// Lazy load analytics to prevent blocking
const AnalyticsWrapper = lazy(
  () => import('./analytics-wrapper').then(mod => ({ default: mod.AnalyticsWrapper }))
);

export function TemplateContent({ children }: { children: React.ReactNode }) {
  return (
    <ThemeWrapper>
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-cyan-600 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
      >
        Skip to main content
      </a>
      <Header />
      <main id="main-content" tabIndex={-1} className="pt-20">
        {/* Wrap main content in Suspense for streaming SSR */}
        <Suspense
          fallback={
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="space-y-4 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent"></div>
                <p className="text-gray-400">Loading content...</p>
              </div>
            </div>
          }
        >
          {children}
        </Suspense>
      </main>
      <Footer />
      <ScrollToTop />
      {/* Analytics in Suspense boundary to prevent blocking */}
      <Suspense fallback={null}>
        <AnalyticsWrapper />
      </Suspense>
      {/* Service Worker Registration */}
      <ServiceWorkerRegistration />
      {/* Accessibility Enhancements */}
      <AccessibilityEnhancements />
    </ThemeWrapper>
  );
}
