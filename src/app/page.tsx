import React from 'react';
import { RouteErrorBoundary } from '@/components/error-boundaries';
import LandingPageServer from '@/features/landing/components/index.server';

export default function Home() {
  return (
    <RouteErrorBoundary routeName="Home">
      <LandingPageServer />
    </RouteErrorBoundary>
  );
}
