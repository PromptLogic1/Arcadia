'use client';

import { BingoLayout } from './layout/BingoLayout';
import BingoBoardsHub from './BingoBoardsHub';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useBingoBoards } from '../hooks/useBingoBoards';

export function BingoBoards() {
  const { loading, error } = useBingoBoards();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="text-red-500">Error loading bingo boards: {error}</div>
    );
  }

  return (
    <div className="space-y-4">
      <BingoLayout>
        <BingoBoardsHub />
      </BingoLayout>
    </div>
  );
}
