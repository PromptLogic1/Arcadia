import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { RouteErrorBoundary } from '@/components/error-boundaries';
import dynamic from 'next/dynamic';

// Dynamic import with error boundary
const BingoBoardsHub = dynamic(
  () => import('@/features/bingo-boards/components/BingoBoardsHub'),
  {
    loading: () => <LoadingSpinner />,
  }
);

export const metadata: Metadata = {
  title: 'Bingo Boards | Arcadia',
  description: 'Create and play custom bingo games with friends in Arcadia.',
};

export default function BingoPage() {
  return (
    <RouteErrorBoundary routeName="BingoPlay">
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 text-center">
            <h1 className="text-gradient-high-contrast color-cyan mb-4 text-4xl font-bold">
              Bingo Boards
            </h1>
            <p className="text-xl text-gray-300">
              Create custom bingo games and play with friends
            </p>
          </div>

          <Suspense fallback={<LoadingSpinner />}>
            <BingoBoardsHub />
          </Suspense>
        </div>
      </div>
    </RouteErrorBoundary>
  );
}
