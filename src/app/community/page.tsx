import React, { Suspense, lazy } from 'react';
import {
  RouteErrorBoundary,
  AsyncBoundary,
} from '@/components/error-boundaries';

const Community = lazy(() =>
  import('@/features/community/components/community').then(mod => ({
    default: mod.default,
  }))
);

// Configuration for dynamic rendering
export const dynamic = 'force-dynamic';

export default function CommunityPage() {
  return (
    <RouteErrorBoundary routeName="Community">
      <AsyncBoundary loadingMessage="Loading community...">
        <Suspense fallback={null}>
          <Community />
        </Suspense>
      </AsyncBoundary>
    </RouteErrorBoundary>
  );
}
