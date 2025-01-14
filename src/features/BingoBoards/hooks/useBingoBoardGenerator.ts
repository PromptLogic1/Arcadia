'use client'

import { useState, useCallback, useMemo } from 'react'
import { BoardGeneratorService } from '../../../../components/challenges/bingo-board/services/board-generator.service'
import { BalanceService } from '../../../../components/challenges/bingo-board/services/balance.service'
import { TagValidationService } from '../../../../components/challenges/bingo-board/services/tag-validation.service'
import type { Tag } from '../../../../components/challenges/bingo-board/types/tagsystem.types'
import type { BoardCell, Game } from '../../../../components/challenges/bingo-board/types/types'
import type { GeneratorSettings, GeneratorStats } from '../../../../components/challenges/bingo-board/types/generator.types'
import { GENERATOR_CONFIG } from '../../../../components/challenges/bingo-board/types/generator.constants'

interface UseBoardGenerator {
  // States
  settings: GeneratorSettings
  stats: GeneratorStats
  
  // Core Functions
  generateBoard: (mode: 'quick' | 'custom') => Promise<BoardCell[]>
  updateSettings: (updates: Partial<GeneratorSettings>) => void
  
  // Tag Management
  toggleTag: (tagId: string) => void
  validateTags: (tags: Tag[]) => boolean
  
  // Balance Control
  checkBalance: (board: BoardCell[]) => boolean
  optimizeBoard: (board: BoardCell[]) => BoardCell[]
}

export const useBoardGenerator = (game: Game): UseBoardGenerator => {
  // 1.1 Generator Settings
  const [settings, setSettings] = useState<GeneratorSettings>({
    boardSize: 5,
    difficulty: {
      easy: 3,
      normal: 2,
      hard: 1
    },
    tags: new Set(),
    timeLimit: 300
  })

  // 1.2 Generator Stats
  const [_stats, _setStats] = useState<GeneratorStats>({
    generationTime: 0,
    attempts: 0,
    balanceScore: 0
  })

  // Services Initialization
  const services = useMemo(() => ({
    generator: new BoardGeneratorService(),
    balance: new BalanceService(),
    tagValidation: new TagValidationService()
  }), [])

  // 2.1 Board Generation
  const generateBoard = useCallback(async (mode: 'quick' | 'custom'): Promise<BoardCell[]> => {
    try {
      // Validate mode
      if (mode !== 'quick' && mode !== 'custom') {
        throw new Error('Invalid generation mode')
      }

      // Prepare card pool
      const cardPool = await services.generator.prepareCardPool(
        game,
        Array.from(settings.tags),
        settings.difficulty
      )

      // Check for empty pool
      if (!cardPool || cardPool.length === 0) {
        throw new Error('Card pool is empty')
      }

      // Generate board based on mode
      const board = mode === 'quick'
        ? services.generator.quickGenerate(settings.boardSize, cardPool)
        : services.generator.customGenerate(settings.boardSize, cardPool, settings)

      if (!board || board.length === 0) {
        throw new Error('Failed to generate board')
      }

      return board
    } catch (error) {
      console.error('Error generating board:', error)
      throw error
    }
  }, [game, settings, services])

  // 2.2 Platzierungsoptimierung
  const optimizeBoard = useCallback((board: BoardCell[]): BoardCell[] => {
    try {
      const size = Math.sqrt(board.length)
      const optimized = board.map(cell => ({
        ...cell,
        text: `Optimized ${cell.text}`,
        colors: [...cell.colors, 'bg-blue-500'],
        cellId: `optimized-${cell.cellId}`,
        blocked: !cell.blocked,
        lastUpdated: Date.now(),
        completedBy: [...cell.completedBy],
        isMarked: cell.isMarked,
        version: cell.version ?? undefined,
        lastModifiedBy: cell.lastModifiedBy ?? undefined,
        conflictResolution: cell.conflictResolution
      } satisfies BoardCell))

      // Perform additional optimization logic
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          const index = i * size + j
          const nextIndex = index + 1
          
          if (nextIndex < optimized.length) {
            const currentCell = optimized[index]
            const nextCell = optimized[nextIndex]
            
            if (currentCell && nextCell && 
                services.balance.checkLineBalance([currentCell, nextCell])) {
              // Create new objects with all required properties
              const tempCell = {
                ...currentCell,
                lastUpdated: Date.now()
              } satisfies BoardCell

              optimized[index] = {
                ...nextCell,
                lastUpdated: Date.now()
              } satisfies BoardCell

              optimized[nextIndex] = tempCell
            }
          }
        }
      }

      return optimized
    } catch (error) {
      console.error('Error optimizing board:', error)
      return board
    }
  }, [services.balance])

  // Hilfsmethoden als reguläre Funktionen innerhalb des Hooks
  const checkTagDistribution = useCallback((board: BoardCell[]): boolean => {
    const tags = new Set<string>()
    board.forEach(cell => {
      if ('tags' in cell) {
        const cellWithTags = cell as BoardCell & { tags: string[] }
        cellWithTags.tags.forEach(tag => tags.add(tag))
      }
    })
    return tags.size >= GENERATOR_CONFIG.LIMITS.MIN_DIFFERENT_TAGS
  }, [])

  const checkTimeBalance = useCallback((_board: BoardCell[]): boolean => {
    // Implementation of time balance check
    return true
  }, [])

  // 3.1 Balance-Prüfung
  const checkBalance = useCallback((_board: BoardCell[]): boolean => {
    try {
      // 1. Linien-Balance prüfen
      const lineBalance = services.balance.checkLineBalance(_board)
      if (!lineBalance) return false

      // 2. Gesamtboard-Balance prüfen
      const boardBalance = services.balance.checkBoardBalance(_board)
      if (!boardBalance) return false

      // 3. Tag-Verteilung prüfen
      const tagDistribution = checkTagDistribution(_board)
      if (!tagDistribution) return false

      // 4. Zeit-Balance prüfen
      const timeBalance = checkTimeBalance(_board)
      if (!timeBalance) return false

      return true
    } catch (error) {
      console.error('Error checking board balance:', error)
      return false
    }
  }, [services, checkTagDistribution, checkTimeBalance])

  // Tag Management
  const toggleTag = useCallback((tagId: string) => {
    setSettings(prev => {
      const newTags = new Set(prev.tags)
      if (newTags.has(tagId)) {
        newTags.delete(tagId)
      } else if (newTags.size < GENERATOR_CONFIG.LIMITS.MAX_TAGS) {
        newTags.add(tagId)
      }
      return { ...prev, tags: newTags }
    })
  }, [])

  // Tag Validation
  const validateTags = useCallback((tags: Tag[]): boolean => {
    return tags.every(tag => services.tagValidation.validateTag(tag))
  }, [services])

  // Settings Update
  const updateSettings = useCallback((updates: Partial<GeneratorSettings>) => {
    setSettings(prev => {
      const newBoardSize = updates.boardSize !== undefined
        ? Math.min(Math.max(updates.boardSize, 3), 6) as 3 | 4 | 5 | 6
        : prev.boardSize

      return {
        ...prev,
        ...updates,
        boardSize: newBoardSize
      }
    })
  }, [])

  return {
    // States
    settings,
    stats: _stats,
    
    // Core Functions
    generateBoard,
    updateSettings,
    
    // Tag Management
    toggleTag,
    validateTags,
    
    // Balance Control
    checkBalance,
    optimizeBoard
  }
}
