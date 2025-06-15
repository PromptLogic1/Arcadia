'use client';

import { Suspense, lazy } from 'react';
import ScrollToTop from './ui/ScrollToTop';
import { ThemeWrapper } from './theme-wrapper';

// Lazy load heavy components
const Header = lazy(() => import('./layout/Header'));
const Footer = lazy(() => import('./layout/Footer'));
const ServiceWorkerRegistration = lazy(() =>
  import('./ServiceWorkerRegistration').then(mod => ({
    default: mod.ServiceWorkerRegistration,
  }))
);
const AccessibilityEnhancements = lazy(() =>
  import('./accessibility/AccessibilityEnhancements').then(mod => ({
    default: mod.AccessibilityEnhancements,
  }))
);
const AnalyticsWrapper = lazy(() =>
  import('./analytics-wrapper').then(mod => ({
    default: mod.AnalyticsWrapper,
  }))
);

// Loading components
const HeaderLoader = () => (
  <header className="fixed top-0 right-0 left-0 z-50 h-20 bg-slate-900/80 backdrop-blur-md" />
);

const FooterLoader = () => <footer className="h-64 bg-slate-900/95" />;

export function TemplateContentOptimized({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeWrapper>
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-cyan-600 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Header with loading state */}
      <Suspense fallback={<HeaderLoader />}>
        <Header />
      </Suspense>

      <main id="main-content" tabIndex={-1} className="pt-20">
        {/* Main content with streaming SSR */}
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

      {/* Footer with loading state */}
      <Suspense fallback={<FooterLoader />}>
        <Footer />
      </Suspense>

      {/* Non-critical components */}
      <ScrollToTop />

      {/* Deferred loading for non-essential features */}
      <Suspense fallback={null}>
        <AnalyticsWrapper />
      </Suspense>
      <Suspense fallback={null}>
        <ServiceWorkerRegistration />
      </Suspense>
      <Suspense fallback={null}>
        <AccessibilityEnhancements />
      </Suspense>
    </ThemeWrapper>
  );
}
