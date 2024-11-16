export interface GameSettings {
  // Game Rules
  teamMode: boolean
  lockout: boolean
  soundEnabled: boolean
  winConditions: {
    line: boolean
    majority: boolean
  }
  
  // Player Settings
  maxPlayerLimit: number
  minPlayers: number
  defaultPlayerLimit: number
  
  // Time Settings
  timeLimit: number
  turnTimeLimit?: number
  
  // Board Settings
  boardSize: number
  difficulty: 'easy' | 'medium' | 'hard'
} 