export interface ServiceResponse<T> {
  data?: T
  error?: string
  success: boolean
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export interface GeneratorResult {
  board: BoardCell[]
  stats: GeneratorStats
  success: boolean
  error?: string
} 