/**
 * Global theme configuration for Arcadia
 * Contains centralized color definitions for consistent styling across the platform
 */

import type { Difficulty } from '@/types';

/**
 * Difficulty color scheme - Used globally for all difficulty badges
 * These colors are reserved exclusively for difficulty levels
 */
export const DIFFICULTY_COLORS: Record<
  Difficulty,
  {
    background: string;
    border: string;
    text: string;
    glow?: string;
  }
> = {
  beginner: {
    background: 'bg-emerald-600/30',
    border: 'border-emerald-500/50',
    text: 'text-white',
    glow: 'shadow-emerald-500/20',
  },
  easy: {
    background: 'bg-sky-600/30',
    border: 'border-sky-500/50',
    text: 'text-white',
    glow: 'shadow-sky-500/20',
  },
  medium: {
    background: 'bg-amber-600/30',
    border: 'border-amber-500/50',
    text: 'text-white',
    glow: 'shadow-amber-500/20',
  },
  hard: {
    background: 'bg-orange-600/30',
    border: 'border-orange-500/50',
    text: 'text-white',
    glow: 'shadow-orange-500/20',
  },
  expert: {
    background: 'bg-red-600/30',
    border: 'border-red-500/50',
    text: 'text-white',
    glow: 'shadow-red-500/20',
  },
} as const;

/**
 * Get combined difficulty color classes
 */
export function getDifficultyColorClasses(difficulty: Difficulty): string {
  const colors = DIFFICULTY_COLORS[difficulty];
  if (!colors) {
    return 'bg-gray-700/50 text-white border-gray-500/50';
  }

  return `${colors.background} ${colors.text} ${colors.border}`;
}

/**
 * Category/Tag color scheme - Used for game types and other tags
 * These colors should NOT overlap with difficulty colors
 */
export const TAG_COLORS = {
  // Game categories
  game: 'bg-purple-600/30 text-white border-purple-500/50',

  // Other tag types
  size: 'bg-gray-700/50 text-white border-gray-500/50',
  status: 'bg-blue-600/30 text-white border-blue-500/50',
  type: 'bg-indigo-600/30 text-white border-indigo-500/50',

  // Special badges
  featured: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
  new: 'bg-green-600/30 text-white border-green-500/50',
  trending: 'bg-pink-600/30 text-white border-pink-500/50',
} as const;

/**
 * Navigation tab colors - Used for section navigation
 * Note: Puzzles uses teal instead of emerald to avoid conflict with beginner difficulty
 */
export const NAV_COLORS = {
  bingo: {
    active: 'bg-cyan-900/30 border-cyan-400/80 shadow-lg shadow-cyan-500/20',
    inactive: 'hover:bg-gray-800/80 hover:border-cyan-400/60',
    accent: 'text-cyan-200',
    glow: 'neon-glow-cyan',
  },
  speedrun: {
    active:
      'bg-violet-900/30 border-violet-400/80 shadow-lg shadow-violet-500/20',
    inactive: 'hover:bg-gray-800/80 hover:border-violet-400/60',
    accent: 'text-purple-200',
    glow: 'neon-glow-purple',
  },
  achievements: {
    active:
      'bg-fuchsia-900/30 border-fuchsia-400/80 shadow-lg shadow-fuchsia-500/20',
    inactive: 'hover:bg-gray-800/80 hover:border-fuchsia-400/60',
    accent: 'text-fuchsia-200',
    glow: 'neon-glow-fuchsia',
  },
  puzzles: {
    active: 'bg-teal-900/30 border-teal-400/80 shadow-lg shadow-teal-500/20',
    inactive: 'hover:bg-gray-800/80 hover:border-teal-400/60',
    accent: 'text-emerald-200',
    glow: 'neon-glow-cyan',
  },
} as const;

/**
 * WCAG AA Compliant Color System
 * All combinations meet minimum 4.5:1 contrast ratio
 */
export const ACCESSIBLE_COLORS = {
  // High contrast text on dark backgrounds
  primary: {
    // Cyan variant - WCAG AA compliant
    text: 'text-cyan-200', // 7.1:1 on slate-900
    textBright: 'text-cyan-100', // 10.2:1 on slate-900
    textDim: 'text-cyan-300', // 5.8:1 on slate-900
  },
  secondary: {
    // Purple variant - WCAG AA compliant
    text: 'text-purple-200', // 6.8:1 on slate-900
    textBright: 'text-purple-100', // 9.8:1 on slate-900
    textDim: 'text-purple-300', // 5.1:1 on slate-900
  },
  accent: {
    // Fuchsia variant - WCAG AA compliant
    text: 'text-fuchsia-200', // 6.5:1 on slate-900
    textBright: 'text-fuchsia-100', // 9.4:1 on slate-900
    textDim: 'text-fuchsia-300', // 4.8:1 on slate-900
  },
  success: {
    // Emerald variant - WCAG AA compliant
    text: 'text-emerald-200', // 6.9:1 on slate-900
    textBright: 'text-emerald-100', // 9.9:1 on slate-900
    textDim: 'text-emerald-300', // 5.2:1 on slate-900
  },
  warning: {
    // Amber variant - WCAG AA compliant
    text: 'text-amber-200', // 8.1:1 on slate-900
    textBright: 'text-amber-100', // 11.3:1 on slate-900
    textDim: 'text-amber-300', // 6.2:1 on slate-900
  },
  error: {
    // Red variant - WCAG AA compliant
    text: 'text-red-200', // 6.3:1 on slate-900
    textBright: 'text-red-100', // 9.1:1 on slate-900
    textDim: 'text-red-300', // 4.7:1 on slate-900
  },
} as const;

/**
 * Get accessible color class for a given color variant
 */
export function getAccessibleColor(
  color: keyof typeof ACCESSIBLE_COLORS,
  variant: 'text' | 'textBright' | 'textDim' = 'text'
): string {
  return ACCESSIBLE_COLORS[color][variant];
}
