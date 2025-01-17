// Constants
export const GAMES = [
  'World of Warcraft',
  'Diablo 4',
  'Path of Exile',
  'Lost Ark',
  'other'
] as const

export const CARD_CATEGORIES = [
  'collecting',
  'killing',
  'building',
  'escaping',
  'surviving',
  'winning',
  'other'
] as const

export const DIFFICULTIES = [
  'beginner',
  'easy',
  'medium',
  'hard',
  'expert'
] as const

// Base types from constants
export type GameCategory = typeof GAMES[number]
export type CardCategory = typeof CARD_CATEGORIES[number]
export type Difficulty = typeof DIFFICULTIES[number]

// Filter options arrays
export const GAME_FILTER_OPTIONS: GameCategory[] = [
  ...GAMES
]

export const CARD_CATEGORY_FILTER_OPTIONS: CardCategory[] = [
  ...CARD_CATEGORIES
]

export const DIFFICULTY_FILTER_OPTIONS: Difficulty[] = [
  ...DIFFICULTIES
]

// Style configurations
export const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  beginner: 'text-green-400 border-green-500/50',
  easy: 'text-blue-400 border-blue-500/50',
  medium: 'text-yellow-400 border-yellow-500/50',
  hard: 'text-orange-400 border-orange-500/50',
  expert: 'text-red-400 border-red-500/50'
}
