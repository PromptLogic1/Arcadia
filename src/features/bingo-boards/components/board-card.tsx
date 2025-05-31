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
      className="bg-card text-card-foreground rounded-lg border shadow-sm"
      data-v0-t="card"
    >
      <div className="flex flex-col space-y-1.5 p-6">
        <h3 className="text-2xl leading-none font-semibold tracking-tight whitespace-nowrap">
          {board.title}
        </h3>
        <p className="text-muted-foreground text-sm">{board.description}</p>
      </div>
      <div className="p-6">
        <div className="text-muted-foreground flex items-center justify-between text-sm">
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
