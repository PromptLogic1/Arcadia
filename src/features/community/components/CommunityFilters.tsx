import React from 'react';
import { Plus } from '@/components/ui/Icons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/ToggleGroup';
import { NeonButton } from '@/components/ui/NeonButton';
import { SearchInput } from './SearchInput';
import { GAMES, CHALLENGE_TYPES } from '@/features/community/constants';
import type { CommunityFilters } from '../hooks/useCommunityFilters';

// =============================================================================
// TYPES
// =============================================================================

export interface CommunityFiltersProps {
  filters: CommunityFilters;
  onSearchChange: (query: string) => void;
  onGameChange: (game: string) => void;
  onChallengeChange: (challenge: string) => void;
  onSortChange: (sort: 'newest' | 'hot') => void;
  onCreateDiscussion: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Community filters toolbar component
 *
 * Features:
 * - Search input with proper placeholder
 * - Game selection dropdown
 * - Challenge type selection dropdown
 * - Sort toggle (newest/hot)
 * - Create discussion button
 * - Responsive layout for mobile/desktop
 */
export function CommunityFilters({
  filters,
  onSearchChange,
  onGameChange,
  onChallengeChange,
  onSortChange,
  onCreateDiscussion,
}: CommunityFiltersProps) {
  return (
    <div className="mb-8 flex flex-col items-center justify-between rounded-lg border border-gray-700/50 bg-gray-800/30 p-4 md:flex-row">
      {/* Left side: Search and Filters */}
      <div className="mb-4 flex flex-col space-y-2 md:mb-0 md:flex-row md:space-y-0 md:space-x-4">
        {/* Search Input */}
        <SearchInput
          value={filters.searchQuery}
          onValueChangeAction={onSearchChange}
          placeholder="Search discussions..."
          className="min-w-[300px]"
        />

        {/* Filter Dropdowns */}
        <div className="flex space-x-4">
          {/* Game Filter */}
          <Select value={filters.selectedGame} onValueChange={onGameChange}>
            <SelectTrigger className="min-w-[180px] border-gray-700/50 bg-gray-800/50 transition-colors hover:border-cyan-500/50 focus:border-cyan-500">
              <SelectValue placeholder="Select Game" />
            </SelectTrigger>
            <SelectContent className="border-gray-700 bg-gray-800">
              {GAMES.map(game => (
                <SelectItem
                  key={game}
                  value={game}
                  className="cursor-pointer hover:bg-cyan-500/10"
                >
                  {game}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Challenge Type Filter */}
          <Select
            value={filters.selectedChallenge}
            onValueChange={onChallengeChange}
          >
            <SelectTrigger className="min-w-[180px] border-gray-700/50 bg-gray-800/50 transition-colors hover:border-cyan-500/50 focus:border-cyan-500">
              <SelectValue placeholder="Select Challenge" />
            </SelectTrigger>
            <SelectContent className="border-gray-700 bg-gray-800">
              {CHALLENGE_TYPES.map(challenge => (
                <SelectItem
                  key={challenge}
                  value={challenge}
                  className="cursor-pointer hover:bg-cyan-500/10"
                >
                  {challenge}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Right side: Sort and Actions */}
      <div className="flex items-center space-x-4">
        {/* Sort Toggle */}
        <ToggleGroup
          type="single"
          value={filters.sortBy}
          onValueChange={(value: string) => {
            // Type guard for sort values
            if (value === 'newest' || value === 'hot') {
              onSortChange(value);
            }
          }}
          className="rounded-lg border border-gray-700/50 bg-gray-800/50 p-1"
        >
          <ToggleGroupItem
            value="newest"
            className="data-[state=on]:bg-gradient-to-r data-[state=on]:from-cyan-500 data-[state=on]:to-fuchsia-500 data-[state=on]:text-white"
          >
            Newest
          </ToggleGroupItem>
          <ToggleGroupItem
            value="hot"
            className="data-[state=on]:bg-gradient-to-r data-[state=on]:from-orange-500 data-[state=on]:to-red-500 data-[state=on]:text-white"
          >
            Hot
          </ToggleGroupItem>
        </ToggleGroup>

        {/* Create Discussion Button */}
        <NeonButton
          onClick={onCreateDiscussion}
          className="transform bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white shadow-lg shadow-cyan-500/20 transition-all duration-300 hover:scale-105 hover:from-cyan-600 hover:to-fuchsia-600"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Discussion
        </NeonButton>
      </div>
    </div>
  );
}
