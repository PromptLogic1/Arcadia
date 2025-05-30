'use client';

import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Filter } from '@/components/filter/filter';
import {
  DIFFICULTY_OPTIONS,
  DEFAULT_SORT_OPTIONS,
} from '@/components/filter/types';
import { default as BoardCard } from './board-card';
import { CreateBoardForm } from './CreateBoardForm';
import { NeonText } from '@/components/ui/NeonText';
import { useBingoBoardsHub } from '../hooks/useBingoBoardsHub';
import { Constants, type GameCategory } from '@/types';

export default function BingoBoardsHub() {
  const {
    boards,
    isCreateFormOpen,
    filterSelections,
    handleFilterChange,
    setIsCreateFormOpen,
    handleCreateBoard,
  } = useBingoBoardsHub();

  // Convert game categories to filter options format
  const categoryOptions = [
    { value: '__all__', label: 'All Games' },
    ...Constants.public.Enums.game_category
      .filter((game: GameCategory) => game !== 'All Games')
      .map((game: GameCategory) => ({
        value: game,
        label: game,
      })),
  ];

  return (
    <div className="space-y-6">
      <Filter
        filterOptions={{
          categories: categoryOptions,
          difficulties: DIFFICULTY_OPTIONS,
          sortOptions: DEFAULT_SORT_OPTIONS,
          enableSearch: true,
        }}
        selections={filterSelections}
        onFilterChange={handleFilterChange}
      />

      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold">
          <NeonText>Your Bingo Boards</NeonText>
        </h3>
        <Button
          onClick={() => setIsCreateFormOpen(true)}
          className="bg-gradient-to-r from-cyan-500 to-fuchsia-500"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Board
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {boards.map(board => (
          <BoardCard key={board.id} board={board} />
        ))}
      </div>

      <CreateBoardForm
        isOpen={isCreateFormOpen}
        onOpenChange={setIsCreateFormOpen}
        createBoardAction={handleCreateBoard}
      />
    </div>
  );
}
