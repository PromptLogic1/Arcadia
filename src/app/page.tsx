import React from 'react';
import { type Metadata } from 'next';
import { RouteErrorBoundary } from '@/components/error-boundaries';
import LandingPageServer from '@/features/landing/components/index.server';
import {
  homepageMetadata,
  generateGamePlatformSchema,
  generateBreadcrumbSchema,
} from '@/lib/metadata';

export const metadata: Metadata = homepageMetadata;

export default function Home() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
  ]);

  const gamePlatformSchema = generateGamePlatformSchema();

  return (
    <RouteErrorBoundary routeName="Home">
      {/* Homepage-specific structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([breadcrumbSchema, gamePlatformSchema]),
        }}
      />
      <LandingPageServer />
    </RouteErrorBoundary>
  );
}
