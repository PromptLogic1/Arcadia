import { supabase } from '@/lib/supabase_lib/supabase'
import { store } from '@/src/store'
import { setCardsForSelection, setSelectedCards, setIsLoading, setError } from '../slices/bingogeneratorSlice'
import type { BingoCard } from '../types/bingocard.types'
import type { CardCategory, Difficulty } from '../types/game.types'
import { indexToGridPosition } from '@/src/features/BingoBoards/utils/gridHelpers'
import { setBingoGridCards } from '../slices/bingocardsSlice'
import { GeneratorSettings, LineBalance, GENERATOR_CONFIG, GeneratorDifficulty } from '../types/generator.types'
import { CARD_CATEGORIES } from '../types/game.types'

class BingoGeneratorService {
  private supabase = supabase

  constructor() {
    if (!this.supabase) {
      console.error('Supabase client not properly initialized')
    }
  }

  private async fetchCardsForSelection(settings: GeneratorSettings, gridSize: number): Promise<void> {
    try {
      const authState = store.getState().auth
      if (!authState.userdata?.id) {
        throw new Error('User not authenticated')
      }

      // Get pool size limit first
      const poolSizeLimit = GENERATOR_CONFIG.CARDPOOLSIZE_LIMITS[settings.cardPoolSize]

      let query = this.supabase
        .from('bingocards')
        .select('*')
        .eq('game_category', settings.gameCategory)
        .is('deleted_at', null)
        .limit(poolSizeLimit) // Apply limit early

      console.log('Settings:', settings)

      // Apply card source filter
      if (settings.cardSource === 'public') {
        query = query.eq('is_public', true)
      } else if (settings.cardSource === 'private') {
        query = query.eq('creator_id', authState.userdata.id)
      } else {
        query = query.or(`is_public.eq.true,creator_id.eq.${authState.userdata.id}`)
      }

      // Apply category filters only if not using all categories
      if (settings.selectedCategories.length > 0 && settings.selectedCategories.length !== CARD_CATEGORIES.length) {
        query = query.in('card_type', settings.selectedCategories)
      }

      // Apply minimum votes filter for public cards
      if (settings.cardSource !== 'private' && settings.minVotes > 0) {
        query = query.gte('votes', settings.minVotes)
      }

      // Apply difficulty distribution
      const difficultyLevel = GENERATOR_CONFIG.DIFFICULTY_LEVELS[settings.difficulty]
      if (difficultyLevel) {
        query = query.in('card_difficulty', Object.keys(difficultyLevel))
      }

      const { data: cards, error } = await query

      if (error) {
        throw new Error(`Database error: ${error.message}`)
      }

      if (!cards || cards.length === 0) {
        throw new Error('No cards available for the selected criteria')
      }

      //Check if cards are enough
      const requiredCards = gridSize * gridSize
      if (cards.length < requiredCards) {
        throw new Error(`Not enough cards found for your settings. Need ${requiredCards} cards but only found ${cards.length}. Try adjusting your filters (difficulty, categories, or card source) to get more cards.`)
      }

      store.dispatch(setCardsForSelection(cards))

    } catch (error) {
      console.error('Error fetching cards:', error)
      throw error // Propagate error to be handled by generateBingoBoard
    }
  }

  private validateBoardBalance(
    selectedCards: BingoCard[], 
    gridSize: number, 
    difficulty: GeneratorDifficulty
  ): { isValid: boolean; message: string } {
    try {
      // 1. Check category distribution
      const categoryCount = selectedCards.reduce((acc, card) => {
        acc[card.card_type] = (acc[card.card_type] || 0) + 1
        return acc
      }, {} as Record<CardCategory, number>)

      const maxCategoryPercentage = 0.4 // No more than 40% of one category
      const totalCells = gridSize * gridSize
      for (const [category, count] of Object.entries(categoryCount)) {
        if (count / totalCells > maxCategoryPercentage) {
          return {
            isValid: false,
            message: `Too many ${category} cards (${count}). Maximum allowed is ${Math.floor(totalCells * maxCategoryPercentage)}`
          }
        }
      }

      // 2. Check difficulty spread
      const difficultyCount = selectedCards.reduce((acc, card) => {
        acc[card.card_difficulty] = (acc[card.card_difficulty] || 0) + 1
        return acc
      }, {} as Record<Difficulty, number>)

      // Add actual difficulty distribution check
      const difficultyLevel = GENERATOR_CONFIG.DIFFICULTY_LEVELS[difficulty]
      for (const [difficulty, count] of Object.entries(difficultyCount)) {
        const maxAllowed = Math.ceil(totalCells * (difficultyLevel[difficulty as Difficulty] || 0))
        if (count > maxAllowed) {
          return {
            isValid: false,
            message: `Too many ${difficulty} cards (${count}). Maximum allowed is ${maxAllowed}`
          }
        }
      }

      // Ensure no consecutive expert/hard cards
      for (let i = 0; i < selectedCards.length - 1; i++) {
        const current = selectedCards[i].card_difficulty
        const next = selectedCards[i + 1].card_difficulty
        if ((current === 'expert' && next === 'expert') ||
            (current === 'expert' && next === 'hard') ||
            (current === 'hard' && next === 'expert')) {
          return {
            isValid: false,
            message: 'Found consecutive expert/hard cards. Adjusting balance...'
          }
        }
      }

      // 3. Check line balance
      const rows = Array.from({ length: gridSize }, (_, i) => 
        selectedCards.slice(i * gridSize, (i + 1) * gridSize)
      )

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        if (!row) continue;  // Skip if row is undefined
        
        const rowDifficulty = row.reduce((sum, card) => {
          const weights = { beginner: 1, easy: 2, medium: 3, hard: 4, expert: 5 }
          return sum + weights[card.card_difficulty]
        }, 0)

        if (rowDifficulty > gridSize * 3.5) { // Adjust threshold as needed
          return {
            isValid: false,
            message: `Row ${i + 1} is too difficult. Adjusting balance...`
          }
        }
      }

      return { isValid: true, message: 'Board is balanced' }
    } catch (error) {
      console.error('Error validating board balance:', error)
      return { isValid: false, message: 'Error validating board balance' }
    }
  }

  private async generateBalancedBoard(gridSize: number): Promise<void> {
    try {
      store.dispatch(setIsLoading(true))
      const cardsForSelection = store.getState().bingogenerator.cardsforselection

      if (!cardsForSelection.length) {
        throw new Error('No cards available for selection')
      }

      let attempts = 0
      const maxAttempts = 5
      let selectedCards: BingoCard[] | null = null
      let validationResult = { isValid: false, message: '' }

      while (attempts < maxAttempts) {
        attempts++
        selectedCards = await this.attemptBoardGeneration(gridSize)
        
        if (selectedCards) {
          validationResult = this.validateBoardBalance(selectedCards, gridSize, settings.difficulty)
          if (validationResult.isValid) {
            break
          }
          console.log(`Attempt ${attempts}: ${validationResult.message}`)
        }
      }

      if (!selectedCards || !validationResult.isValid) {
        throw new Error(
          `Failed to generate a balanced board after ${maxAttempts} attempts. ` +
          (validationResult.message || 'Try adjusting your settings.')
        )
      }

      store.dispatch(setSelectedCards(selectedCards))

    } catch (error) {
      console.error('Error generating balanced board:', error)
      store.dispatch(setError(error instanceof Error ? error.message : 'Failed to generate balanced board'))
    } finally {
      store.dispatch(setIsLoading(false))
    }
  }

  // Helper method to attempt board generation
  private async attemptBoardGeneration(gridSize: number): Promise<BingoCard[] | null> {
    try {
      const cardsForSelection = store.getState().bingogenerator.cardsforselection
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

      return selectedCards
    } catch (error) {
      console.error('Error in board generation attempt:', error)
      return null
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
  ): BingoCard {
    const unusedCards = availableCards.filter(card => !usedCardIds.has(card.id))
    if (unusedCards.length === 0) {
      throw new Error('No more available cards to select from')
    }

    // Get random subset for variety
    const candidateCards = this.getRandomSubset(unusedCards, 10)
    
    let bestCard = candidateCards[0] // Ensure we at least return a card
    let bestScore = this.calculateCardScore(bestCard, affectedLines)

    for (const card of candidateCards.slice(1)) {
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
      if (!line) continue;  // Skip undefined lines
      
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

    return score / (affectedLines.filter(line => line).length || 1)  // Avoid division by zero
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
      if (!line || !line.tierDistribution || !line.categoryDistribution) continue;
      
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
      store.dispatch(setError(null))

      // 1. Fetch cards based on settings
      await this.fetchCardsForSelection(settings, gridSize)
      
      /*const cards = store.getState().bingogenerator.cardsforselection
      // 2. Check if we have enough cards
      //const requiredCards = gridSize * gridSize
      //if (cards.length < requiredCards) {
      //  throw new Error(
      //    `Not enough cards found for your settings. Need ${requiredCards} cards but only found ${cards.length}. ` +
      //    'Try adjusting your filters (difficulty, categories, or card source) to get more cards.'
      //  )
      */

      // 4. Generate balanced board
      //await this.generateBalancedBoard(gridSize)

      const cards = store.getState().bingogenerator.cardsforselection
      if (!cards.length) {
        throw new Error('No cards found for selection')
      }

      // Rand Selection Cards 
      const selectedCards = this.getRandomSubset(cards, gridSize * gridSize)
      // 3. Store cards for selection
      store.dispatch(setCardsForSelection(selectedCards))

      //Copy selected cards to Grid
      store.dispatch(setBingoGridCards(selectedCards))

    } catch (error) {
      let errorMessage = 'Failed to generate board'
      
      if (error instanceof Error) {
        // Handle specific error cases
        if (error.message.includes('No cards available')) {
          errorMessage = 'No cards found matching your criteria. Try adjusting your filters.'
        } else if (error.message.includes('Not enough cards')) {
          errorMessage = error.message
        }
      }
      
      store.dispatch(setError(errorMessage))
      console.error('Generator error:', error)
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