import { LucideIcon } from 'lucide-react'

export interface Challenge {
  id: string
  name: string
  description: string
  icon: LucideIcon
  details: string
  keyFeatures: string[]
  difficulty: string
  estimatedTime: string
  disabled: boolean
}

export interface ChallengeSection {
  id: string
  component: React.ComponentType
  path: string
} 