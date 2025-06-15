'use client';

import React, { Suspense, lazy } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { Tables } from '@/types';

type BingoBoard = Tables<'bingo_boards'>;

interface VirtualizedBoardsListProps {
  boards: BingoBoard[];
  children: (board: BingoBoard, index: number) => React.ReactNode;
}

// Lazy load the virtualization component
const VirtualizedList = lazy(() =>
  import('./VirtualizedListInner').then(m => ({
    default: m.VirtualizedListInner,
  }))
);

export function VirtualizedBoardsList({
  boards,
  children,
}: VirtualizedBoardsListProps) {
  // For small lists, don't use virtualization to avoid the overhead
  // Reduced threshold from 100 to 20 for better performance
  if (boards.length <= 20) {
    return (
      <div className="space-y-6">
        {boards.map((board, index) => (
          <div key={board.id || index}>{children(board, index)}</div>
        ))}
      </div>
    );
  }

  // For larger lists, use virtualization
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <VirtualizedList boards={boards}>{children}</VirtualizedList>
    </Suspense>
  );
}
