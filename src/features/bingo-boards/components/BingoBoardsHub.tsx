'use client';

import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DIFFICULTY_OPTIONS } from '@/types';
import { default as BoardCard } from './board-card';
import { CreateBoardForm } from './CreateBoardForm';
import { NeonText } from '@/components/ui/NeonText';
import { useBingoBoardsHub } from '../hooks/useBingoBoardsHub';
import {
  Constants as _Constants,
  type GameCategory as _GameCategory,
  type Tables,
} from '@/types';

// Use the database type directly to avoid conflicts
type _BingoBoard = Tables<'bingo_boards'>;

export default function BingoBoardsHub() {
  const {
    boards,
    isCreateFormOpen,
    filterSelections,
    handleFilterChange,
    setIsCreateFormOpen,
    handleCreateBoard,
  } = useBingoBoardsHub();

  // Sort options for the select
  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'rating', label: 'Highest Rated' },
  ];

  return (
    <div className="space-y-6">
      {/* Simple Filter Bar */}
      <div className="bg-card flex flex-wrap gap-4 rounded-lg border p-4">
        <div className="min-w-[200px] flex-1">
          <Input
            placeholder="Search boards..."
            value={filterSelections.search}
            onChange={e => handleFilterChange('search', e.target.value)}
          />
        </div>

        <Select
          value={filterSelections.difficulty}
          onValueChange={value => handleFilterChange('difficulty', value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Difficulties</SelectItem>
            {DIFFICULTY_OPTIONS.map(difficulty => (
              <SelectItem key={difficulty.value} value={difficulty.value}>
                {difficulty.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filterSelections.sort}
          onValueChange={value => handleFilterChange('sort', value)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
        {boards.map((board) => (
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
