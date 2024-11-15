'use client'

import { useState, useCallback, useMemo } from 'react'
import { BoardGeneratorService } from '../services/board-generator.service'
import { BalanceService } from '../services/balance.service'
import { TagValidationService } from '../services/tag-validation.service'
import type { Tag } from '../types/tag-system.types'
import type { BoardCell, Game } from '../types/types'
import type { GeneratorSettings, GeneratorStats } from '../types/generator.types'
import { GENERATOR_CONFIG } from '../types/generator.constants'

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
  const [stats, setStats] = useState<GeneratorStats>({
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
    const startTime = performance.now()
    let attempts = 0
    let board: BoardCell[] = []
    let isBalanced = false

    try {
      // Kartenpool vorbereiten
      const filteredCards = await services.generator.prepareCardPool(
        game,
        Array.from(settings.tags),
        settings.difficulty
      )

      // Generierungsversuche mit Balance-Prüfung
      while (!isBalanced && attempts < GENERATOR_CONFIG.LIMITS.MAX_ATTEMPTS) {
        attempts++
        
        board = mode === 'quick'
          ? services.generator.quickGenerate(settings.boardSize, filteredCards)
          : services.generator.customGenerate(settings.boardSize, filteredCards, settings)

        isBalanced = services.balance.checkBoardBalance(board)
      }

      // Stats aktualisieren
      const endTime = performance.now()
      setStats({
        generationTime: endTime - startTime,
        attempts,
        balanceScore: services.balance.calculateBalanceScore(board)
      })

      if (!isBalanced) {
        throw new Error('Could not generate balanced board')
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
      // Initiale Balance-Prüfung
      let optimizedBoard = [...board]
      let balanceScore = services.balance.calculateBalanceScore(optimizedBoard)
      
      // Iterative Optimierung bis Ziel-Score erreicht
      while (balanceScore < GENERATOR_CONFIG.LIMITS.MIN_BALANCE_SCORE) {
        optimizedBoard = services.generator.optimizePlacement(optimizedBoard)
        balanceScore = services.balance.calculateBalanceScore(optimizedBoard)
      }

      return optimizedBoard
    } catch (error) {
      console.error('Error optimizing board:', error)
      return board
    }
  }, [services])

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

  const checkTimeBalance = useCallback((board: BoardCell[]): boolean => {
    // Implementierung der Zeitbalance-Prüfung
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
      console.error('Error checking balance:', error)
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
      const newBoardSize = updates.boardSize 
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
    stats,
    
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
