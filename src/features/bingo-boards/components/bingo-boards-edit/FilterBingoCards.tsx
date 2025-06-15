import { Button } from '@/components/ui/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import type { Difficulty, FilterOptions } from '@/types';
import { DIFFICULTIES } from '@/types';
import { X } from '@/components/ui/Icons';
import { useState } from 'react';
import { log } from '@/lib/logger';
import { toError } from '@/lib/error-guards';

interface FilterBingoCardsProps {
  onFilter: (filters: FilterOptions) => void;
  onClear: () => void;
}

export function FilterBingoCards({ onFilter, onClear }: FilterBingoCardsProps) {
  const [filters, setFilters] = useState<FilterOptions>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleFilter = async () => {
    try {
      setIsLoading(true);
      onFilter(filters);
    } catch (error) {
      log.error('Error applying filters', toError(error), {
        component: 'FilterBingoCards',
        metadata: { filters: filters },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    try {
      setIsLoading(true);
      setFilters({
        difficulty: 'all',
      });
      onClear();
    } catch (error) {
      log.error('Error clearing filters', toError(error), {
        component: 'FilterBingoCards',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-lg bg-gray-800/30 p-2">
      <div className="w-full">
        <Select
          defaultValue="all"
          value={filters.difficulty || 'all'}
          onValueChange={(value: Difficulty | 'all') =>
            setFilters(prev => ({ ...prev, difficulty: value }))
          }
          disabled={isLoading}
        >
          <SelectTrigger className="border-cyan-500/50 bg-gray-800/50">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent className="border-cyan-500 bg-gray-800">
            <SelectItem value="all">All Difficulties</SelectItem>
            {DIFFICULTIES.map(difficulty => (
              <SelectItem key={difficulty} value={difficulty}>
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleClear}
          className="gap-1"
          disabled={isLoading}
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
        <Button
          size="sm"
          onClick={handleFilter}
          className="bg-gradient-to-r from-cyan-500 to-fuchsia-500"
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Apply Filters'}
        </Button>
      </div>
    </div>
  );
}
