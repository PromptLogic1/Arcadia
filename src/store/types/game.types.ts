// Game Categories
export type GameCategory = 
  | 'All Games'
  | 'World of Warcraft'
  | 'Fortnite'
  | 'Minecraft'
  | 'Among Us'
  | 'Apex Legends'
  | 'League of Legends'
  | 'Overwatch'
  | 'Call of Duty: Warzone'
  | 'Valorant'

// Difficulty Levels
export type Difficulty = 
  | 'all'
  | 'beginner'
  | 'easy'
  | 'medium'
  | 'hard'
  | 'expert'

// Card Categories
export type CardCategory = 
  | 'all'
  | 'collecting'
  | 'killing'
  | 'building'
  | 'escaping'
  | 'surviving'
  | 'winning'

// User Roles from SQL
export type UserRole = 'user' | 'moderator' | 'admin'

// Challenge Status
export type ChallengeStatus = 'draft' | 'published' | 'archived'

// Submission Status
export type SubmissionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'timeout'

// Programming Languages
export type ProgrammingLanguage = 
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'java'
  | 'cpp'
  | 'rust'

// Board Status
export type BoardStatus = 'draft' | 'active' | 'completed' | 'archived'

// Cell Properties
export type CellDifficulty = 'normal' | 'hard' | 'extreme'
export type CellReward = 'block' | 'extra_turn' | 'power_up'

// Event Status
export type EventStatus = 'upcoming' | 'active' | 'completed' | 'cancelled'
export type ParticipantStatus = 'registered' | 'confirmed' | 'checked_in' | 'completed'

// Style Constants
export const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  'beginner': 'text-green-400',
  'easy': 'text-green-400',
  'medium': 'text-yellow-400',
  'hard': 'text-orange-400',
  'expert': 'text-red-400',
  'all': 'text-gray-400'
}

// Constants
export const GAMES: GameCategory[] = [
  'All Games',
  'World of Warcraft',
  'Fortnite',
  'Minecraft',
  'Among Us',
  'Apex Legends',
  'League of Legends',
  'Overwatch',
  'Call of Duty: Warzone',
  'Valorant'
]

export const CARD_CATEGORIES: CardCategory[] = [
  'all',
  'collecting',
  'killing',
  'building',
  'escaping',
  'surviving',
  'winning'
]

export const DIFFICULTIES: Difficulty[] = [
  'all',
  'beginner',
  'easy',
  'medium',
  'hard',
  'expert'
]

// Default values as constants
export const DEFAULT_CARD_CATEGORY: CardCategory = 'all'
export const DEFAULT_DIFFICULTY: Difficulty = 'all'
export const DEFAULT_GAME_CATEGORY: GameCategory = 'All Games'
