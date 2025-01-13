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
export const DIFFICULTY_STYLES = {
  'all': 'bg-gray-500/10 text-gray-300 border-gray-500/20 hover:border-gray-500/40 hover:bg-gray-500/20',
  'beginner': 'bg-green-500/10 text-green-300 border-green-500/20 hover:border-green-500/40 hover:bg-green-500/20',
  'easy': 'bg-blue-500/10 text-blue-300 border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/20',
  'medium': 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20 hover:border-yellow-500/40 hover:bg-yellow-500/20',
  'hard': 'bg-orange-500/10 text-orange-300 border-orange-500/20 hover:border-orange-500/40 hover:bg-orange-500/20',
  'expert': 'bg-red-500/10 text-red-300 border-red-500/20 hover:border-red-500/40 hover:bg-red-500/20'
} as const

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
