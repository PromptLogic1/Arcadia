'use client';

import dynamic from 'next/dynamic';

// Dynamically import analytics to prevent SSR issues
const Analytics = dynamic(
  () => import('@vercel/analytics/react').then(mod => mod.Analytics),
  { ssr: false }
);

const SpeedInsights = dynamic(
  () => import('@vercel/speed-insights/next').then(mod => mod.SpeedInsights),
  { ssr: false }
);

export function AnalyticsWrapper() {
  // Since we're using dynamic imports with ssr: false,
  // these components will only render on the client
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}