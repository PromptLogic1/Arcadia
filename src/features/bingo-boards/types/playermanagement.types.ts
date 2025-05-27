import type { Player } from './types'

export interface TeamInfo {
  name: string
  color: string
  size: number
}

export interface TeamState {
  names: [string, string]
  colors: [string, string]
  sizes: Record<number, number>
}

export interface PlayerManagementState {
  players: Player[]
  currentPlayer: number
  teamState: TeamState
}

export interface PlayerValidationResult {
  isValid: boolean
  errors: string[]
}

export type PlayerEvent = 
  | { type: 'playerJoin'; player: Player }
  | { type: 'playerLeave'; playerId: string }
  | { type: 'teamChange'; playerId: string; newTeam: number }
  | { type: 'teamUpdate'; teamId: number; updates: Partial<TeamInfo> }

export interface UsePlayerManagement {
  // States
  players: Player[]
  teamNames: [string, string]
  teamColors: [string, string]
  currentPlayer: number
  
  // Player Management
  addPlayer: () => void
  removePlayer: (index: number) => void
  updatePlayerInfo: (index: number, name: string, color: string, team?: number) => void
  switchTeam: (playerId: string, newTeam: number) => void
  
  // Team Management  
  updateTeamName: (teamId: number, name: string) => void
  updateTeamColor: (teamId: number, color: string) => void
  balanceTeams: () => void
  
  // Validation
  validateTeamSize: () => boolean
}

// Event System
declare global {
  interface WindowEventMap {
    'playerManagement': CustomEvent<PlayerEvent>
  }
}

// Session Integration
export interface PlayerSessionData {
  players: Player[]
  teamState: TeamState
  lastUpdate: number
}
