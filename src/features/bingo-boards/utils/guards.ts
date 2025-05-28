import type { GameCategory, Difficulty } from '../types';
import { Constants } from '@/types/database.core';

export function isValidGameCategory(value: string): value is GameCategory {
  return (Constants.public.Enums.game_category as readonly string[]).includes(
    value
  );
}

export function isValidDifficulty(value: string): value is Difficulty {
  return (
    Constants.public.Enums.difficulty_level as readonly string[]
  ).includes(value as Difficulty);
}
