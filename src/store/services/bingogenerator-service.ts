import { supabase } from '@/lib/supabase_lib/supabase'
import { store } from '@/src/store'
import { setCardsForSelection, setSelectedCards, setIsLoading, setError } from '../slices/bingogeneratorSlice'
import type { BingoCard } from '../types/bingocard.types'
import type { CardCategory, Difficulty } from '../types/game.types'
import { indexToGridPosition } from '@/src/features/BingoBoards/utils/gridHelpers'
import { setBingoGridCards } from '../slices/bingocardsSlice'
import { GeneratorSettings, LineBalance, GENERATOR_CONFIG } from '../types/generator.types'

class BingoGeneratorService {
  private supabase = supabase

  constructor() {
    if (!this.supabase) {
      console.error('Supabase client not properly initialized')
    }
  }

  private async fetchCardsForSelection(settings: GeneratorSettings): Promise<void> {
    try {
      store.dispatch(setIsLoading(true))
      store.dispatch(setError(null))

      const authState = store.getState().auth
      if (!authState.userdata || !authState.userdata.id) {
        throw new Error('User not authenticated')
      }

      const userId = authState.userdata.id

      const difficultyConfig = GENERATOR_CONFIG.DIFFICULTY_LEVELS[settings.difficulty]
      const targetPoolSize = GENERATOR_CONFIG.CARDPOOLSIZE_LIMITS[settings.cardPoolSize]

      // Calculate number of cards needed for each tier based on percentages
      const cardCounts = Object.entries(difficultyConfig).reduce((acc, [tier, percentage]) => {
        acc[tier] = Math.round(targetPoolSize * percentage)
        return acc
      }, {} as Record<string, number>)

      // Map tiers to difficulties
      const tierToDifficulty: Record<string, Difficulty> = {
        T5: 'beginner',
        T4: 'easy',
        T3: 'medium',
        T2: 'hard',
        T1: 'expert'
      }

      // Fetch cards for each tier
      const cardPromises = Object.entries(cardCounts).map(async ([tier, count]) => {
        let query = this.supabase
          .from('bingocards')
          .select('*')
          .eq('card_difficulty', tierToDifficulty[tier])
          .eq('game_category', settings.gameCategory)
          .in('card_type', settings.selectedCategories)
          .gte('votes', settings.minVotes)
          .is('deleted_at', null)
          .order('votes', { ascending: false })
          .limit(count)

        // Handle public/private card filtering
        if (settings.publicCards !== 'all') {
          query = query.eq('is_public', settings.publicCards)
          
          // If fetching private cards, use authenticated user's ID
          if (settings.publicCards === false) {
            query = query.eq('creator_id', userId)
          }
        }

        const { data: cards, error } = await query

        if (error) throw error
        return cards || []
      })

      const cardsByTier = await Promise.all(cardPromises)
      const allCards = cardsByTier.flat()

      store.dispatch(setCardsForSelection(allCards))

    } catch (error) {
      console.error('Error fetching cards for selection:', error)
      store.dispatch(setError(error instanceof Error ? error.message : 'Failed to fetch cards'))
    } finally {
      store.dispatch(setIsLoading(false))
    }
  }

  private async generateBalancedBoard(gridSize: number): Promise<void> {
    try {
      store.dispatch(setIsLoading(true))
      const cardsForSelection = store.getState().bingogenerator.cardsforselection

      if (!cardsForSelection.length) {
        throw new Error('No cards available for selection')
      }

      const totalCells = gridSize * gridSize
      const selectedCards: BingoCard[] = new Array(totalCells)
      const usedCardIds = new Set<string>()

      // Initialize line tracking
      const rows: LineBalance[] = Array.from({ length: gridSize }, () => this.createEmptyLineBalance())
      const cols: LineBalance[] = Array.from({ length: gridSize }, () => this.createEmptyLineBalance())
      const diagonals: LineBalance[] = [
        this.createEmptyLineBalance(),
        this.createEmptyLineBalance()
      ]

      // Fill board cell by cell using balance weights
      for (let i = 0; i < totalCells; i++) {
        const { row, col } = indexToGridPosition(i, gridSize)
        const isDiagonal1 = row - 1 === col - 1
        const isDiagonal2 = row - 1 === gridSize - col

        // Get affected lines for current position
        const affectedLines = [
          rows[row - 1],
          cols[col - 1],
          ...(isDiagonal1 ? [diagonals[0]] : []),
          ...(isDiagonal2 ? [diagonals[1]] : [])
        ].filter(line => line !== undefined)

        // Select best card for position
        const selectedCard = this.selectBestCard(
          cardsForSelection,
          usedCardIds,
          affectedLines
        )

        if (!selectedCard) {
          throw new Error('Could not find suitable card for position')
        }

        // Update board and tracking
        selectedCards[i] = selectedCard
        usedCardIds.add(selectedCard.id)
        this.updateLineBalances(selectedCard, affectedLines)
      }

      store.dispatch(setSelectedCards(selectedCards))

    } catch (error) {
      console.error('Error generating balanced board:', error)
      store.dispatch(setError(error instanceof Error ? error.message : 'Failed to generate board'))
    } finally {
      store.dispatch(setIsLoading(false))
    }
  }

  private createEmptyLineBalance(): LineBalance {
    return {
      tierDistribution: {
        beginner: 0,
        easy: 0,
        medium: 0,
        hard: 0,
        expert: 0
      },
      categoryDistribution: {
        collecting: 0,
        killing: 0,
        building: 0,
        escaping: 0,
        surviving: 0,
        winning: 0,
        other: 0
      }
    }
  }

  private selectBestCard(
    availableCards: BingoCard[],
    usedCardIds: Set<string>,
    affectedLines: LineBalance[]
  ): BingoCard | null {
    let bestCard: BingoCard | null = null
    let bestScore = -1

    // Get random subset of available cards for variety
    const candidateCards = this.getRandomSubset(
      availableCards.filter(card => !usedCardIds.has(card.id)),
      10
    )

    for (const card of candidateCards) {
      const score = this.calculateCardScore(card, affectedLines)
      if (score > bestScore) {
        bestScore = score
        bestCard = card
      }
    }

    return bestCard
  }

  private calculateCardScore(card: BingoCard, affectedLines: LineBalance[]): number {
    let score = 0

    for (const line of affectedLines) {
      // Tier balance score
      const tierScore = this.calculateTierScore(card.card_difficulty, line.tierDistribution)
      
      // Category variety score
      const categoryScore = this.calculateCategoryScore(card.card_type, line.categoryDistribution)
      
      // Use GENERATOR_CONFIG.BALANCE_WEIGHTS
      score += (
        tierScore * GENERATOR_CONFIG.BALANCE_WEIGHTS.tierSpread +
        categoryScore * GENERATOR_CONFIG.BALANCE_WEIGHTS.tagVariety +
        Math.random() * GENERATOR_CONFIG.BALANCE_WEIGHTS.timeDistribution
      )
    }

    return score / affectedLines.length
  }

  private calculateTierScore(
    difficulty: Difficulty,
    distribution: Record<Difficulty, number>
  ): number {
    const totalCards = Object.values(distribution).reduce((a, b) => a + b, 0)
    if (totalCards === 0) return 1

    // Prefer underrepresented tiers
    const currentRatio = distribution[difficulty] / totalCards
    return 1 - currentRatio
  }

  private calculateCategoryScore(
    category: CardCategory,
    distribution: Record<CardCategory, number>
  ): number {
    const totalCards = Object.values(distribution).reduce((a, b) => a + b, 0)
    if (totalCards === 0) return 1

    // Prefer underrepresented categories
    const currentRatio = distribution[category] / totalCards
    return 1 - currentRatio
  }

  private updateLineBalances(card: BingoCard, lines: LineBalance[]): void {
    for (const line of lines) {
      line.tierDistribution[card.card_difficulty]++
      line.categoryDistribution[card.card_type]++
    }
  }

  private getRandomSubset<T>(array: T[], size: number): T[] {
    const shuffled = [...array].sort(() => 0.5 - Math.random())
    return shuffled.slice(0, Math.min(size, array.length))
  }

  // Public wrapper method
  async generateBingoBoard(settings: GeneratorSettings, gridSize: number): Promise<void> {
    try {
      store.dispatch(setIsLoading(true))
      
      // Step 1: Initialize card pool
      await this.fetchCardsForSelection(settings)
      
      // Step 2: Generate balanced board
      await this.generateBalancedBoard(gridSize)
      
      // Step 3: Distribute to grid
      await this.distributeToGrid()
      
    } catch (error) {
      console.error('Error in board generation process:', error)
      store.dispatch(setError(error instanceof Error ? error.message : 'Failed to generate board'))
    } finally {
      store.dispatch(setIsLoading(false))
    }
  }

  // Reshuffle without new database fetch
  async reshuffleBoard(gridSize: number): Promise<void> {
    try {
      store.dispatch(setIsLoading(true))
      const cardsForSelection = store.getState().bingogenerator.cardsforselection

      if (!cardsForSelection.length) {
        throw new Error('No cards available for reshuffling')
      }

      // Generate new balanced board from existing card pool
      await this.generateBalancedBoard(gridSize)
      
      // Distribute to grid
      await this.distributeToGrid()

    } catch (error) {
      console.error('Error reshuffling board:', error)
      store.dispatch(setError(error instanceof Error ? error.message : 'Failed to reshuffle board'))
    } finally {
      store.dispatch(setIsLoading(false))
    }
  }

  private async distributeToGrid(): Promise<void> {
    const selectedCards = store.getState().bingogenerator.selectedCards
    if (!selectedCards.length) {
      throw new Error('No cards selected for distribution')
    }

    store.dispatch(setBingoGridCards(selectedCards))
  }
}

export const bingoGeneratorService = new BingoGeneratorService()