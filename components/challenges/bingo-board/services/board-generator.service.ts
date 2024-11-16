import type { BoardCell, Game } from '../types/types'
import type { GeneratorSettings } from '../types/generator.types'
import { GENERATOR_CONFIG } from '../types/generator.constants'
import type { Tag } from '../types/tagsystem.types'
import { wowChallenges } from '../types/constants'

interface CardPoolItem extends BoardCell {
  tier: 1 | 2 | 3 | 4 | 5
  tags: string[]
}

export class BoardGeneratorService {
  // Kartenpool vorbereiten und filtern
  async prepareCardPool(
    game: Game,
    tags: string[],
    difficulty: GeneratorSettings['difficulty']
  ): Promise<CardPoolItem[]> {
    try {
      const mockPool = this.getMockCardPool(game)
      
      // Filtern nach Tags wenn vorhanden
      const tagFiltered = tags.length > 0
        ? mockPool.filter(card => 
            tags.some(tag => card.tags.includes(tag))
          )
        : mockPool

      // Difficulty-basierte Filterung
      return this.filterByDifficulty(tagFiltered, difficulty)
    } catch (error) {
      console.error('Error preparing card pool:', error)
      throw error
    }
  }

  // Schnelle Board-Generierung mit Standardeinstellungen
  quickGenerate(
    size: number,
    cardPool: CardPoolItem[]
  ): BoardCell[] {
    try {
      if (cardPool.length === 0) {
        throw new Error('Card pool is empty')
      }

      const board: BoardCell[] = []
      const totalCells = size * size
      
      // Zufällige Auswahl aus dem Pool
      for (let i = 0; i < totalCells; i++) {
        const randomIndex = Math.floor(Math.random() * cardPool.length)
        const selectedCard = cardPool[randomIndex]
        
        if (!selectedCard) {
          throw new Error('Invalid card selected from pool')
        }

        board.push({
          text: selectedCard.text,
          colors: [],
          completedBy: [],
          blocked: false,
          isMarked: false,
          cellId: `${i}-${Date.now()}`
        })
      }

      return board
    } catch (error) {
      console.error('Error in quick generation:', error)
      throw error
    }
  }

  // Erweiterte Board-Generierung mit allen Optionen
  customGenerate(
    size: number,
    cardPool: CardPoolItem[],
    settings: GeneratorSettings
  ): BoardCell[] {
    try {
      if (cardPool.length === 0) {
        throw new Error('Card pool is empty')
      }

      const board: BoardCell[] = []
      const totalCells = size * size
      
      // Tier-Verteilung basierend auf Difficulty berechnen
      const tierDistribution = this.calculateTierDistribution(
        settings.difficulty,
        totalCells
      )

      // Board mit verteilten Tiers füllen
      for (let i = 0; i < totalCells; i++) {
        const tier = this.getNextTier(tierDistribution)
        const availableCards = cardPool.filter(card => card.tier === tier)
        
        if (availableCards.length === 0) {
          throw new Error(`No cards available for tier ${tier}`)
        }

        const randomIndex = Math.floor(Math.random() * availableCards.length)
        const selectedCard = availableCards[randomIndex]

        if (!selectedCard) {
          throw new Error('Invalid card selected from filtered pool')
        }
        
        board.push({
          text: selectedCard.text,
          colors: [],
          completedBy: [],
          blocked: false,
          isMarked: false,
          cellId: `${i}-${Date.now()}`
        })
      }

      return board
    } catch (error) {
      console.error('Error in custom generation:', error)
      throw error
    }
  }

  // Board-Platzierung optimieren
  optimizePlacement(board: BoardCell[]): BoardCell[] {
    try {
      const size = Math.sqrt(board.length)
      const optimized = [...board]
      
      // Implementierung der Optimierungslogik basierend auf:
      // 1. Schwierigkeitsverteilung pro Linie
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          const index = i * size + j
          const nextIndex = index + 1
          
          if (nextIndex < optimized.length) {
            // Prüfen und ggf. Zellen tauschen für bessere Balance
            this.swapCellsIfImproved(optimized, index, nextIndex)
          }
        }
      }

      return optimized
    } catch (error) {
      console.error('Error optimizing placement:', error)
      return board
    }
  }

  // Private Hilfsmethoden
  private getMockCardPool(_game: Game): CardPoolItem[] {
    return wowChallenges.map((challenge, index) => ({
      text: challenge,
      colors: [],
      completedBy: [],
      blocked: false,
      isMarked: false,
      cellId: `mock-${index}`,
      tier: (Math.floor(index / 5) + 1) as 1 | 2 | 3 | 4 | 5,
      tags: ['mock-tag']
    }))
  }

  private filterByDifficulty(
    cards: CardPoolItem[],
    difficulty: GeneratorSettings['difficulty']
  ): CardPoolItem[] {
    const difficultyWeights = GENERATOR_CONFIG.DIFFICULTY_LEVELS
    const totalWeight = Object.values(difficulty).reduce((a, b) => a + b, 0)

    return cards.filter(card => {
      const tierWeight = this.getTierWeight(card.tier, difficultyWeights)
      return Math.random() < (tierWeight / totalWeight)
    })
  }

  private calculateTierDistribution(
    difficulty: GeneratorSettings['difficulty'],
    totalCells: number
  ): Map<number, number> {
    const distribution = new Map<number, number>()
    const weights = GENERATOR_CONFIG.DIFFICULTY_LEVELS
    
    // Berechne die gewichtete Verteilung für jeden Tier
    Object.entries(weights).forEach(([level, tierWeights]) => {
      const difficultyWeight = difficulty[level.toLowerCase() as keyof typeof difficulty]
      
      Object.entries(tierWeights).forEach(([tier, weight]) => {
        const tierNumber = parseInt(tier.substring(1))
        const cellCount = Math.round(totalCells * weight * difficultyWeight)
        
        distribution.set(
          tierNumber,
          (distribution.get(tierNumber) || 0) + cellCount
        )
      })
    })

    return distribution
  }

  private getNextTier(distribution: Map<number, number>): 1 | 2 | 3 | 4 | 5 {
    const availableTiers = Array.from(distribution.entries())
      .filter(([_, count]) => count > 0)
    
    if (availableTiers.length === 0) {
      return 1 // Fallback auf niedrigsten Tier
    }

    const selectedTier = availableTiers[Math.floor(Math.random() * availableTiers.length)]
    if (!selectedTier) return 1

    const [tier, _] = selectedTier
    
    // Reduziere verfügbare Anzahl für diesen Tier
    distribution.set(tier, (distribution.get(tier) || 0) - 1)
    
    return tier as 1 | 2 | 3 | 4 | 5
  }

  private getTierWeight(
    tier: number,
    weights: typeof GENERATOR_CONFIG.DIFFICULTY_LEVELS
  ): number {
    const tierKey = `T${tier}` as keyof typeof weights.EASY
    let totalWeight = 0

    Object.values(weights).forEach(difficultyLevel => {
      const weight = difficultyLevel[tierKey as keyof typeof difficultyLevel]
      if (weight !== undefined) {
        totalWeight += weight
      }
    })

    return totalWeight
  }

  private swapCellsIfImproved(
    board: BoardCell[],
    index1: number,
    index2: number
  ): void {
    if (index1 >= 0 && index1 < board.length && 
        index2 >= 0 && index2 < board.length) {
      const cell1 = board[index1]
      const cell2 = board[index2]
      
      if (cell1 && cell2) {
        board[index1] = cell2
        board[index2] = cell1
      }
    }
  }
} 