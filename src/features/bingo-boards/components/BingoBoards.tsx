'use client';

import { BingoLayout } from './layout/BingoLayout';
import BingoBoardsHub from './BingoBoardsHub';

export function BingoBoards() {
  return (
    <div className="space-y-4">
      <BingoLayout>
        <BingoBoardsHub />
      </BingoLayout>
    </div>
  );
}
