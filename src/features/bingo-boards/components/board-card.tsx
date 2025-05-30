'use client';

import React from 'react';
import type { BingoBoard } from '@/features/bingo-boards/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface BoardCardProps {
  board: BingoBoard;
}

const BoardCard: React.FC<BoardCardProps> = ({ board }) => {
  // Dummy data for participants and completion rate, replace with actual data
  const participants = Math.floor(Math.random() * 100);
  const completionRate = Math.floor(Math.random() * 100);

  return (
    <div
      className="rounded-lg border bg-card text-card-foreground shadow-sm"
      data-v0-t="card"
    >
      <div className="flex flex-col space-y-1.5 p-6">
        <h3 className="whitespace-nowrap text-2xl font-semibold leading-none tracking-tight">
          {board.title}
        </h3>
        <p className="text-sm text-muted-foreground">{board.description}</p>
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Participants: {participants}</span>
          <span>Completion Rate: {completionRate}%</span>
        </div>
      </div>
      <div className="flex items-center p-6">
        <Link href={`/challenge-hub/${board.id}`}>
          <Button variant="default">View Board</Button>
        </Link>
      </div>
    </div>
  );
};

export default BoardCard;
