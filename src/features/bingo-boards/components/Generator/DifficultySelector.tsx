'use client';

import React from 'react';
import { Label } from '@/components/ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Gauge } from '@/components/ui/Icons';
import type { Difficulty as _Difficulty } from '@/types';
import type { Enums } from '@/types/database.types';
import { DIFFICULTIES } from '@/src/types/index';

// Type alias for clean usage
type DifficultyLevel = Enums<'difficulty_level'>;

// Type guard for difficulty level
function isDifficultyLevel(value: string): value is DifficultyLevel {
  // Check against known difficulty values
  return (
    value === 'beginner' ||
    value === 'easy' ||
    value === 'medium' ||
    value === 'hard' ||
    value === 'expert'
  );
}

interface DifficultySelectorProps {
  difficulty: DifficultyLevel;
  onDifficultyChangeAction: (
    difficulty: DifficultyLevel
  ) => Promise<void> | void;
}

export const DifficultySelector: React.FC<DifficultySelectorProps> = ({
  difficulty,
  onDifficultyChangeAction,
}) => {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm font-medium text-cyan-400">
        <Gauge className="h-4 w-4" />
        Difficulty
      </Label>
      <Select
        value={difficulty}
        onValueChange={async value => {
          // Type guard for difficulty values
          if (isDifficultyLevel(value)) {
            await onDifficultyChangeAction(value);
          }
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select difficulty" />
        </SelectTrigger>
        <SelectContent>
          {DIFFICULTIES.map((level: DifficultyLevel) => (
            <SelectItem key={level} value={level}>
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
