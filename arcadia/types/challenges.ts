import { ReactNode } from 'react'

export interface Challenge {
  id: string
  name: string
  icon: () => ReactNode
  description: string
  details: string
  keyFeatures: string[]
  difficulty: string
  estimatedTime: string
  disabled?: boolean
} 