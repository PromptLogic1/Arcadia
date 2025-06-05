import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PlayAreaHub } from '@/features/play-area/components';
import { RouteErrorBoundary, AsyncBoundary } from '@/components/error-boundaries';

export const metadata: Metadata = {
  title: 'Play Area | Arcadia',
  description:
    'Host your own challenges or join active gaming sessions in the Arcadia Play Area.',
};

export default function PlayAreaPage() {
  return (
    <RouteErrorBoundary routeName="PlayArea">
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
        <AsyncBoundary loadingMessage="Loading play area...">
          <div className="container mx-auto px-4 py-8">
            <PlayAreaHub />
          </div>
        </AsyncBoundary>
      </div>
    </RouteErrorBoundary>
  );
}
