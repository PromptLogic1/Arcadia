import { supabase } from '@/lib/supabase'
import type { BingoCardsTable } from '@/types/database.bingo'
import type { GameCategory, DifficultyLevel } from '@/types/database.core'

// Type definitions from database
type BingoCard = BingoCardsTable['Row']
type CreateCardData = BingoCardsTable['Insert']
type UpdateCardData = BingoCardsTable['Update']

// Filter interface
export interface CardFilters {
  gameType?: GameCategory
  difficulty?: DifficultyLevel
  isPublic?: boolean
  creatorId?: string
  tags?: string[]
  searchTerm?: string
  limit?: number
  offset?: number
}

// Service interface for bingo cards
export interface BingoCardService {
  // Card CRUD operations
  getCards: (filters?: CardFilters) => Promise<BingoCard[]>
  getCardById: (id: string) => Promise<BingoCard | null>
  createCard: (cardData: CreateCardData) => Promise<BingoCard | null>
  updateCard: (id: string, updates: UpdateCardData) => Promise<BingoCard | null>
  deleteCard: (id: string) => Promise<boolean>
  
  // Public card operations
  getPublicCards: (gameType?: GameCategory) => Promise<BingoCard[]>
  initializePublicCards: () => Promise<BingoCard[]>
  
  // Card search and filtering
  searchCards: (query: string, filters?: CardFilters) => Promise<BingoCard[]>
  getCardsByTags: (tags: string[]) => Promise<BingoCard[]>
  getCardsByDifficulty: (difficulty: DifficultyLevel) => Promise<BingoCard[]>
  getCardsByCreator: (creatorId: string) => Promise<BingoCard[]>
}

// Service implementation
class BingoCardServiceImpl implements BingoCardService {
  async getCards(filters: CardFilters = {}): Promise<BingoCard[]> {
    try {
      let query = supabase
        .from('bingo_cards')
        .select('*')

      // Apply filters
      if (filters.gameType) {
        query = query.eq('game_type', filters.gameType)
      }
      
      if (filters.difficulty) {
        query = query.eq('difficulty', filters.difficulty)
      }
      
      if (filters.isPublic !== undefined) {
        query = query.eq('is_public', filters.isPublic)
      }
      
      if (filters.creatorId) {
        query = query.eq('creator_id', filters.creatorId)
      }
      
      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags)
      }
      
      if (filters.searchTerm) {
        query = query.or(`title.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`)
      }

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit)
      }
      
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1)
      }

      // Order by creation date (newest first)
      query = query.order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) {
        console.error('Error fetching cards:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getCards:', error)
      return []
    }
  }

  async getCardById(id: string): Promise<BingoCard | null> {
    try {
      const { data, error } = await supabase
        .from('bingo_cards')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching card:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in getCardById:', error)
      return null
    }
  }

  async createCard(cardData: CreateCardData): Promise<BingoCard | null> {
    try {
      const { data, error } = await supabase
        .from('bingo_cards')
        .insert({
          ...cardData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating card:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in createCard:', error)
      return null
    }
  }

  async updateCard(id: string, updates: UpdateCardData): Promise<BingoCard | null> {
    try {
      const { data, error } = await supabase
        .from('bingo_cards')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating card:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in updateCard:', error)
      return null
    }
  }

  async deleteCard(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('bingo_cards')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting card:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in deleteCard:', error)
      return false
    }
  }

  async getPublicCards(gameType?: GameCategory): Promise<BingoCard[]> {
    const filters: CardFilters = { 
      isPublic: true,
      limit: 100 // Reasonable limit for public cards
    }
    
    if (gameType && gameType !== 'All Games') {
      filters.gameType = gameType
    }
    
    return this.getCards(filters)
  }

  async initializePublicCards(): Promise<BingoCard[]> {
    return this.getPublicCards()
  }

  async searchCards(query: string, filters: CardFilters = {}): Promise<BingoCard[]> {
    return this.getCards({
      ...filters,
      searchTerm: query
    })
  }

  async getCardsByTags(tags: string[]): Promise<BingoCard[]> {
    return this.getCards({ tags })
  }

  async getCardsByDifficulty(difficulty: DifficultyLevel): Promise<BingoCard[]> {
    return this.getCards({ difficulty })
  }

  async getCardsByCreator(creatorId: string): Promise<BingoCard[]> {
    return this.getCards({ creatorId })
  }
}

// Export singleton instance
export const bingoCardService = new BingoCardServiceImpl()

// Export types
export type { BingoCard, CreateCardData, UpdateCardData } 