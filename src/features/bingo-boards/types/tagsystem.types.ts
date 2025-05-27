export type TagType = 'core' | 'game' | 'community'
export type TagStatus = 'active' | 'proposed' | 'verified' | 'archived' | 'suspended'

export interface Tag {
  id: string
  name: string
  type: TagType
  category: TagCategory
  status: TagStatus
  description: string
  game?: string
  createdAt: Date
  updatedAt: Date
  usageCount: number
  votes: number
  createdBy?: string
}

export interface TagCategory {
  id: string
  name: 'difficulty' | 'timeInvestment' | 'primaryCategory' | 'gamePhase' | 'requirements' | 'playerMode' | 'custom'
  isRequired: boolean
  allowMultiple: boolean
  validForGames: string[]
}

export interface TagValidationRules {
  minLength: number
  maxLength: number
  allowedCharacters: RegExp
  forbiddenTerms: string[]
  minUsageForVoting: number
  minVotesForVerification: number
  votingDurationDays: number
}

export interface TagVote {
  tagId: string
  userId: string
  vote: 'up' | 'down'
  timestamp: Date
}

export interface TagHistory {
  id: string
  tagId: string
  action: 'create' | 'update' | 'delete' | 'vote' | 'verify' | 'archive'
  changes: Record<string, unknown>
  performedBy: string
  timestamp: Date
} 