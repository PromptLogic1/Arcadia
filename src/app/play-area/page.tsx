import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PlayAreaHub } from '@/features/play-area/components';

export const metadata: Metadata = {
  title: 'Play Area | Arcadia',
  description:
    'Host your own challenges or join active gaming sessions in the Arcadia Play Area.',
};

export default function PlayAreaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <Suspense fallback={<LoadingSpinner />}>
        <div className="container mx-auto px-4 py-8">
          <PlayAreaHub />
        </div>
      </Suspense>
    </div>
  );
}
