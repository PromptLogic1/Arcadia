'use client';

import { BingoBoardEdit } from '@/src/features/bingo-boards/components/BingoBoardsEdit/BingoBoardEdit';
import { useRouter } from 'next/navigation';
import { use } from 'react';

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
    <BingoBoardEdit
      boardId={resolvedParams.boardId}
      onSaveSuccess={() => {
        // Handle success state if needed
      }}
    />
  );
}
