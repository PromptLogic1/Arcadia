export const dynamic = 'force-dynamic';

import React, { Suspense, lazy } from 'react';
import { RouteErrorBoundary } from '@/components/error-boundaries';

const ChallengeHub = lazy(() =>
  import('@/features/challenge-hub/components/ChallengeHub').then(mod => ({
    default: mod.default,
  }))
);

export default function ChallengeHubPage() {
  return (
    <RouteErrorBoundary routeName="ChallengeHub">
      <Suspense
        fallback={
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="space-y-4 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent"></div>
              <p className="text-gray-400">Loading Challenge Hub...</p>
            </div>
          </div>
        }
      >
        <ChallengeHub />
      </Suspense>
    </RouteErrorBoundary>
  );
}
