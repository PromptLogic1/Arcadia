import type { DifficultyLevel, GameCategory } from '@/types/database.types'

export type Difficulty = DifficultyLevel

export const DIFFICULTIES: readonly Difficulty[] = [
  'beginner',
  'easy', 
  'medium',
  'hard',
  'expert'
] as const

export const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  beginner: 'bg-green-100 text-green-800 border-green-200',
  easy: 'bg-blue-100 text-blue-800 border-blue-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  hard: 'bg-orange-100 text-orange-800 border-orange-200',
  expert: 'bg-red-100 text-red-800 border-red-200'
} as const

export const GAME_CATEGORIES: readonly GameCategory[] = [
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
] as const

export interface Game {
  id: string
  name: GameCategory
  icon?: string
  color?: string
}

export interface GameSettings {
  selectedGame: GameCategory
  difficulty: Difficulty
  teamMode: boolean
  lockout: boolean
  soundEnabled: boolean
  winConditions: {
    line: boolean
    majority: boolean
    diagonal: boolean
    corners: boolean
  }
} 