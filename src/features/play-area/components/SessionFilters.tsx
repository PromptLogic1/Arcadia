'use client';

import React, { useTransition } from 'react';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Search, X } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';

// Types
import type { SessionFilters } from '../../../services/sessions.service';
import type { Enums } from '@/types/database.types';

type GameCategory = Enums<'game_category'>;
type Difficulty = Enums<'difficulty_level'>;

interface SessionFiltersProps {
  filters: SessionFilters;
  onFiltersChange: (filters: SessionFilters) => void;
  className?: string;
}

const GAME_CATEGORIES: (GameCategory | 'All Games')[] = [
  'All Games',
  'World of Warcraft',
  'Fortnite',
  'Minecraft',
  'Among Us',
  'Apex Legends',
  'League of Legends',
  'Overwatch',
  'Call of Duty: Warzone',
  'Valorant',
  'CS:GO',
  'Dota 2',
  'Rocket League',
  'Fall Guys',
  'Dead by Daylight',
  'Cyberpunk 2077',
  'The Witcher 3',
  'Elden Ring',
  'Dark Souls',
  'Bloodborne',
  'Sekiro',
  'Hollow Knight',
  'Celeste',
  'Hades',
  'The Binding of Isaac',
  'Risk of Rain 2',
  'Deep Rock Galactic',
  'Valheim',
  'Subnautica',
  "No Man's Sky",
  'Terraria',
  'Stardew Valley',
  'Animal Crossing',
  'Splatoon 3',
  'Super Mario Odyssey',
  'The Legend of Zelda: Breath of the Wild',
  'Super Smash Bros. Ultimate',
];

const _DIFFICULTIES: (Difficulty | 'all')[] = [
  'all',
  'beginner',
  'easy',
  'medium',
  'hard',
  'expert',
];

// Type guards for safe value validation
function isValidGameCategory(value: string): value is GameCategory {
  return (
    value === 'World of Warcraft' ||
    value === 'Fortnite' ||
    value === 'Minecraft' ||
    value === 'Among Us' ||
    value === 'Apex Legends' ||
    value === 'League of Legends' ||
    value === 'Overwatch' ||
    value === 'Call of Duty: Warzone' ||
    value === 'Valorant' ||
    value === 'CS:GO' ||
    value === 'Dota 2' ||
    value === 'Rocket League' ||
    value === 'Fall Guys' ||
    value === 'Dead by Daylight' ||
    value === 'Cyberpunk 2077' ||
    value === 'The Witcher 3' ||
    value === 'Elden Ring' ||
    value === 'Dark Souls' ||
    value === 'Bloodborne' ||
    value === 'Sekiro' ||
    value === 'Hollow Knight' ||
    value === 'Celeste' ||
    value === 'Hades' ||
    value === 'The Binding of Isaac' ||
    value === 'Risk of Rain 2' ||
    value === 'Deep Rock Galactic' ||
    value === 'Valheim' ||
    value === 'Subnautica' ||
    value === "No Man's Sky" ||
    value === 'Terraria' ||
    value === 'Stardew Valley' ||
    value === 'Animal Crossing' ||
    value === 'Splatoon 3' ||
    value === 'Super Mario Odyssey' ||
    value === 'The Legend of Zelda: Breath of the Wild' ||
    value === 'Super Smash Bros. Ultimate'
  );
}

function isValidDifficulty(value: string): value is Difficulty {
  return (
    value === 'beginner' ||
    value === 'easy' ||
    value === 'medium' ||
    value === 'hard' ||
    value === 'expert'
  );
}

function isValidSessionStatus(value: string): value is 'active' | 'waiting' {
  return value === 'active' || value === 'waiting';
}

/**
 * Session Filters Component
 * Provides filtering and search functionality for sessions
 */
export function SessionFilters({
  filters,
  onFiltersChange,
  className,
}: SessionFiltersProps) {
  // React 19 optimizations
  const [isPending, startTransition] = useTransition();

  const updateFilter = <K extends keyof SessionFilters>(
    key: K,
    value: SessionFilters[K]
  ) => {
    // Use transition for non-urgent filter updates to prevent blocking UI
    if (key === 'search') {
      // Search is urgent, update immediately
      onFiltersChange({
        ...filters,
        [key]: value,
      });
    } else {
      // Other filters are not urgent, use transition
      startTransition(() => {
        onFiltersChange({
          ...filters,
          [key]: value,
        });
      });
    }
  };

  const clearFilters = () => {
    // Clearing filters is not urgent, use transition
    startTransition(() => {
      onFiltersChange({
        search: '',
        gameCategory: undefined,
        difficulty: undefined,
        status: undefined,
        showPrivate: false,
      });
    });
  };

  const hasActiveFilters =
    filters.search ||
    filters.gameCategory ||
    filters.difficulty ||
    filters.status ||
    filters.showPrivate;

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.gameCategory) count++;
    if (filters.difficulty) count++;
    if (filters.status) count++;
    if (filters.showPrivate) count++;
    return count;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and Quick Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search sessions, hosts, or boards..."
            value={filters.search}
            onChange={e => updateFilter('search', e.target.value)}
            className="border-gray-600 bg-gray-900/50 pl-10 text-gray-100 placeholder-gray-400"
          />
        </div>

        {hasActiveFilters && (
          <Button
            variant="secondary"
            size="sm"
            onClick={clearFilters}
            disabled={isPending}
            className={cn(
              'shrink-0 border-gray-600 text-gray-300 hover:bg-gray-700/50',
              isPending && 'cursor-not-allowed opacity-50'
            )}
          >
            <X className="mr-1 h-4 w-4" />
            Clear ({getActiveFilterCount()})
          </Button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={filters.gameCategory || 'All Games'}
          onValueChange={value =>
            updateFilter(
              'gameCategory',
              value === 'All Games'
                ? undefined
                : isValidGameCategory(value)
                  ? value
                  : undefined
            )
          }
        >
          <SelectTrigger className="w-[180px] border-gray-600 bg-gray-900/50">
            <SelectValue placeholder="Game Category" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px] border-gray-600 bg-gray-800">
            {GAME_CATEGORIES.map(category => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.difficulty || 'all'}
          onValueChange={value =>
            updateFilter(
              'difficulty',
              value === 'all'
                ? undefined
                : isValidDifficulty(value)
                  ? value
                  : undefined
            )
          }
        >
          <SelectTrigger className="w-[140px] border-gray-600 bg-gray-900/50">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent className="border-gray-600 bg-gray-800">
            <SelectItem value="all">All Difficulties</SelectItem>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
            <SelectItem value="expert">Expert</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.status || 'all'}
          onValueChange={value =>
            updateFilter(
              'status',
              value === 'all'
                ? undefined
                : isValidSessionStatus(value)
                  ? value
                  : undefined
            )
          }
        >
          <SelectTrigger className="w-[140px] border-gray-600 bg-gray-900/50">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="border-gray-600 bg-gray-800">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="waiting">Waiting for Players</SelectItem>
            <SelectItem value="active">Active</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge
              variant="secondary"
              className="border-cyan-500/30 bg-cyan-500/20 text-cyan-300"
            >
              Search: &ldquo;{filters.search}&rdquo;
              <X
                className="ml-1 h-3 w-3 cursor-pointer hover:text-cyan-100"
                onClick={() => updateFilter('search', '')}
              />
            </Badge>
          )}

          {filters.gameCategory && (
            <Badge
              variant="secondary"
              className="border-blue-500/30 bg-blue-500/20 text-blue-300"
            >
              Game: {filters.gameCategory}
              <X
                className="ml-1 h-3 w-3 cursor-pointer hover:text-blue-100"
                onClick={() => updateFilter('gameCategory', undefined)}
              />
            </Badge>
          )}

          {filters.difficulty && (
            <Badge
              variant="secondary"
              className="border-purple-500/30 bg-purple-500/20 text-purple-300"
            >
              Difficulty: {filters.difficulty}
              <X
                className="ml-1 h-3 w-3 cursor-pointer hover:text-purple-100"
                onClick={() => updateFilter('difficulty', undefined)}
              />
            </Badge>
          )}

          {filters.status && (
            <Badge
              variant="secondary"
              className="border-green-500/30 bg-green-500/20 text-green-300"
            >
              Status: {filters.status}
              <X
                className="ml-1 h-3 w-3 cursor-pointer hover:text-green-100"
                onClick={() => updateFilter('status', undefined)}
              />
            </Badge>
          )}

          {filters.showPrivate && (
            <Badge
              variant="secondary"
              className="border-orange-500/30 bg-orange-500/20 text-orange-300"
            >
              Include Private
              <X
                className="ml-1 h-3 w-3 cursor-pointer hover:text-orange-100"
                onClick={() => updateFilter('showPrivate', false)}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
