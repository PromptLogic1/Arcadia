'use client';

import React, { Suspense } from 'react';
import Header from './layout/Header';
import Footer from './layout/Footer';
import { ScrollToTop } from './ui/ScrollToTop';
import { ThemeWrapper } from './theme-wrapper';
import { ServiceWorkerRegistration } from './ServiceWorkerRegistration';
import { AccessibilityEnhancements } from './accessibility/AccessibilityEnhancements';
import { AnalyticsWrapper } from './analytics-wrapper';

export function TemplateContent({ children }: { children: React.ReactNode }) {
  return (
    <ThemeWrapper>
      <Header />
      {/* Remove the main wrapper here - let individual pages define their own main landmarks */}
      <div id="main-content" tabIndex={-1} className="pt-20">
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
      </div>
      <Footer />
      <ScrollToTop />
      {/* Analytics without Suspense since it's already using dynamic imports */}
      <AnalyticsWrapper />
      {/* Service Worker Registration */}
      <ServiceWorkerRegistration />
      {/* Accessibility Enhancements */}
      <AccessibilityEnhancements />
    </ThemeWrapper>
  );
}
