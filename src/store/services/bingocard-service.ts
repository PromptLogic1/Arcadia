import { supabase } from '@/lib/supabase_lib/supabase'
import { store } from '@/src/store'
import type { BingoCard, CreateBingoCardDTO } from '../types/bingocard.types'
import type { GameCategory, CardCategory, Difficulty } from '../types/game.types'
import { setBingoCards, setSelectedCardId, setLoading, setError } from '../slices/bingocardsSlice'
import { serverLog } from '@/lib/logger'

class BingoCardService {
  private supabase = supabase

  constructor() {
    if (!this.supabase) {
      console.error('Supabase client not properly initialized')
    }
  }

  async initializeCards() {
    try {
      store.dispatch(setLoading(true))
      
      const authState = store.getState().auth
      if (!authState.userdata?.id) {
        throw new Error('User not authenticated')
      }

      const { data: cards, error } = await this.supabase
        .from('bingocards')
        .select('*')
        .eq('creator_id', authState.userdata.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error

      store.dispatch(setBingoCards(cards || []))
      return cards

    } catch (error) {
      console.error('Bingo cards initialization error:', error)
      store.dispatch(setError(error instanceof Error ? error.message : 'Failed to load cards'))
      return []
    } finally {
      store.dispatch(setLoading(false))
    }
  }

  async getCardById(cardId: string): Promise<BingoCard | null> {
    try {
      store.dispatch(setLoading(true))

      const { data: card, error } = await this.supabase
        .from('bingocards')
        .select('*')
        .eq('id', cardId)
        .single()

      if (error) throw error

      if (card) {
        store.dispatch(setSelectedCardId(card.id))
      }

      return card
    } catch (error) {
      console.error('Error fetching card:', error)
      store.dispatch(setError(error instanceof Error ? error.message : 'Failed to fetch card'))
      return null
    } finally {
      store.dispatch(setLoading(false))
    }
  }

  async createCard(cardData: CreateBingoCardDTO): Promise<BingoCard | null> {
    try {
      store.dispatch(setLoading(true))
      
      const authState = store.getState().auth
      if (!authState.userdata?.id) {
        throw new Error('User not authenticated')
      }

      const { data: card, error } = await this.supabase
        .from('bingocards')
        .insert([{ ...cardData, creator_id: authState.userdata.id }])
        .select()
        .single()

      if (error) throw error

      await this.initializeCards()
      
      return card
    } catch (error) {
      console.error('Error creating card:', error)
      store.dispatch(setError(error instanceof Error ? error.message : 'Failed to create card'))
      return null
    } finally {
      store.dispatch(setLoading(false))
    }
  }

  async updateCard(cardId: string, updates: Partial<BingoCard>): Promise<BingoCard | null> {
    try {
      store.dispatch(setLoading(true))

      const { data: card, error } = await this.supabase
        .from('bingocards')
        .update(updates)
        .eq('id', cardId)
        .select()
        .single()

      if (error) throw error

      await this.initializeCards()
      
      return card
    } catch (error) {
      console.error('Error updating card:', error)
      store.dispatch(setError(error instanceof Error ? error.message : 'Failed to update card'))
      return null
    } finally {
      store.dispatch(setLoading(false))
    }
  }

  async deleteCard(cardId: string): Promise<boolean> {
    try {
      store.dispatch(setLoading(true))

      const { error } = await this.supabase
        .from('bingocards')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', cardId)

      if (error) throw error

      await this.initializeCards()
      
      return true
    } catch (error) {
      console.error('Error deleting card:', error)
      store.dispatch(setError(error instanceof Error ? error.message : 'Failed to delete card'))
      return false
    } finally {
      store.dispatch(setLoading(false))
    }
  }

  async voteCard(cardId: string): Promise<boolean> {
    try {
      store.dispatch(setLoading(true))

      const { data: card, error: fetchError } = await this.supabase
        .from('bingocards')
        .select('votes')
        .eq('id', cardId)
        .single()

      if (fetchError) throw fetchError

      const { error: updateError } = await this.supabase
        .from('bingocards')
        .update({ votes: (card.votes || 0) + 1 })
        .eq('id', cardId)

      if (updateError) throw updateError

      await this.initializeCards()
      
      return true
    } catch (error) {
      console.error('Error voting for card:', error)
      store.dispatch(setError(error instanceof Error ? error.message : 'Failed to vote for card'))
      return false
    } finally {
      store.dispatch(setLoading(false))
    }
  }

  async getCardsByGameCategory(gameCategory: GameCategory): Promise<BingoCard[]> {
    try {
      store.dispatch(setLoading(true))

      const { data: cards, error } = await this.supabase
        .from('bingocards')
        .select('*')
        .eq('game_category', gameCategory)
        .eq('is_public', true)
        .is('deleted_at', null)
        .order('votes', { ascending: false })

      if (error) throw error

      return cards || []
    } catch (error) {
      console.error('Error fetching cards by game category:', error)
      store.dispatch(setError(error instanceof Error ? error.message : 'Failed to fetch cards'))
      return []
    } finally {
      store.dispatch(setLoading(false))
    }
  }

  async filterCards({
    gameCategory,
    cardType,
    difficulty,
    searchTerm
  }: {
    gameCategory?: GameCategory
    cardType?: CardCategory
    difficulty?: Difficulty
    searchTerm?: string
  }): Promise<BingoCard[]> {
    try {
      store.dispatch(setLoading(true))

      let query = this.supabase
        .from('bingocards')
        .select('*')
        .eq('is_public', true)
        .is('deleted_at', null)

      if (gameCategory && gameCategory !== 'All Games') {
        query = query.eq('game_category', gameCategory)
      }
      
      if (cardType) {
        query = query.eq('card_type', cardType)
      }
      
      if (difficulty) {
        query = query.eq('card_difficulty', difficulty)
      }
      
      if (searchTerm) {
        query = query.ilike('card_content', `%${searchTerm}%`)
      }

      const { data: cards, error } = await query.order('votes', { ascending: false })

      if (error) throw error

      return cards || []
    } catch (error) {
      console.error('Error filtering cards:', error)
      store.dispatch(setError(error instanceof Error ? error.message : 'Failed to filter cards'))
      return []
    } finally {
      store.dispatch(setLoading(false))
    }
  }
}

export const bingoCardService = new BingoCardService() 