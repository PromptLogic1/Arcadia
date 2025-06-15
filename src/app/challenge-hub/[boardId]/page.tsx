'use client';

import dynamic from 'next/dynamic';
import {
  RouteErrorBoundary,
  AsyncBoundary,
} from '@/components/error-boundaries';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useRouter } from 'next/navigation';
import { use } from 'react';

// Dynamically import the heavy board editor component
const BingoBoardEdit = dynamic(
  () =>
    import(
      '@/src/features/bingo-boards/components/bingo-boards-edit/BingoBoardEdit'
    ).then(mod => ({ default: mod.BingoBoardEdit })),
  {
    loading: () => (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner className="h-12 w-12" />
      </div>
    ),
    ssr: false,
  }
);

interface BoardPageProps {
  params: Promise<{
    boardId: string;
  }>;
}

export default function BoardPage({ params }: BoardPageProps) {
  const _router = useRouter();
  const resolvedParams = use(params);

  if (!resolvedParams.boardId) {
    return (
      <div className="mt-4 text-center text-red-500">Invalid board ID</div>
    );
  }

  return (
    <RouteErrorBoundary routeName="BoardEdit">
      <AsyncBoundary loadingMessage="Loading board editor...">
        <BingoBoardEdit
          boardId={resolvedParams.boardId}
          onSaveSuccess={() => {
            // Handle success state if needed
          }}
        />
      </AsyncBoundary>
    </RouteErrorBoundary>
  );
}
