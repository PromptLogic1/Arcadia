'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FilterProps, FilterType } from './types';

export function Filter({
  filterOptions,
  selections,
  onFilterChange,
  className,
}: FilterProps) {
  const renderSelect = (
    type: FilterType,
    options: { value: string; label: string }[],
    placeholder: string
  ) => (
    <Select
      value={selections[type]}
      onValueChange={value => onFilterChange(type, value)}
    >
      <SelectTrigger
        className={cn(
          'w-[180px] border-2',
          'border-cyan-500/20 bg-gray-800/95',
          'transition-all duration-200 hover:border-cyan-500/40',
          'text-cyan-300/90 hover:text-cyan-300',
          'focus:border-cyan-500/40 focus:ring-cyan-500/30'
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        className={cn(
          'border-2 border-cyan-500/20 bg-gray-800/95',
          'backdrop-blur-sm'
        )}
      >
        {options.map(option => (
          <SelectItem
            key={option.value}
            value={option.value}
            className={cn(
              'text-cyan-300/90 hover:text-cyan-300',
              'focus:bg-cyan-500/10 focus:text-cyan-300',
              'cursor-pointer hover:bg-cyan-500/10',
              'data-[selected]:bg-cyan-500/20 data-[selected]:text-cyan-300'
            )}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row', className)}>
      <div className="flex flex-1 flex-wrap gap-4">
        {/* Category Filter */}
        {filterOptions.categories &&
          filterOptions.categories.length > 0 &&
          renderSelect(
            'category',
            filterOptions.categories,
            'Filter by Category'
          )}

        {/* Difficulty Filter */}
        {filterOptions.difficulties &&
          filterOptions.difficulties.length > 0 &&
          renderSelect(
            'difficulty',
            filterOptions.difficulties,
            'Filter by Difficulty'
          )}

        {/* Sort Options */}
        {filterOptions.sortOptions &&
          filterOptions.sortOptions.length > 0 &&
          renderSelect('sort', filterOptions.sortOptions, 'Sort by')}
      </div>

      {/* Search Input */}
      {filterOptions.enableSearch && (
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-cyan-400/70" />
          <Input
            placeholder="Search..."
            value={selections.search || ''}
            onChange={e => onFilterChange('search', e.target.value)}
            className={cn(
              'border-2 pl-10',
              'border-cyan-500/20 bg-gray-800/95',
              'transition-all duration-200 hover:border-cyan-500/40',
              'text-cyan-300 placeholder:text-cyan-300/50',
              'focus-visible:border-cyan-500/40 focus-visible:ring-cyan-500/30'
            )}
          />
        </div>
      )}
    </div>
  );
}
