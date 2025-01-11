import { supabase } from '@/lib/supabase_lib/supabase'
import { store } from '@/src/store'
import type { BingoCard, CreateBingoCardDTO } from '../types/bingocard.types'
import type { GameCategory, CardCategory, Difficulty } from '../types/game.types'
import { setBingoCards, setSelectedCardId, setLoading, setError, initializeGrid } from '../slices/bingocardsSlice'
import { serverLog } from '@/lib/logger'
import { DEFAULT_BINGO_CARD, DEFAULT_CARD_ID } from '../types/bingocard.types'
import { UUID } from 'crypto'

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

      console.log('Creating card with data:', cardData) // Debug log

      const { data: card, error } = await this.supabase
        .from('bingocards')
        .insert([{
          ...cardData,
          card_explanation: cardData.card_explanation || '',  // Setze Default-Werte
          votes: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      if (!card) {
        throw new Error('No card data returned after creation')
      }

      await this.initializeCards() // Aktualisiere die Card-Liste
      return card

    } catch (error) {
      console.error('Error details:', error) // Detaillierter Error-Log
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

  async getCardsByIds(cardIds: string[]): Promise<BingoCard[]> {
    try {
      // Filter out empty strings before querying
      const realCardIds = cardIds.filter(id => id !== '')
      
      if (realCardIds.length === 0) return []

      console.log('Fetching cards with IDs:', realCardIds) // Debug

      const { data, error } = await this.supabase
        .from('bingocards')  // Tabellenname korrigiert von 'bingo_cards' zu 'bingocards'
        .select('*')
        .in('id', realCardIds)
        .is('deleted_at', null)

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw new Error(`Database error: ${error.message}`)
      }

      console.log('Fetched cards:', data) // Debug
      return data || []

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching cards'
      console.error('Error fetching cards:', errorMessage)
      throw error
    }
  }

  private validateGridCards(cardIds: string[]): void {
    // Ignoriere leere Strings bei der Duplikat-Prüfung
    const realCardIds = cardIds.filter(id => id !== '')
    
    // Finde Duplikate
    const duplicateIds = realCardIds.filter((id, index) => realCardIds.indexOf(id) !== index)
    
    if (duplicateIds.length > 0) {
      throw new Error(`Duplicate cards found in grid: ${duplicateIds.join(', ')}. Each card can only be used once.`)
    }
  }

  async initializeGridCards(cardIds: string[], size: number): Promise<BingoCard[]> {
    try {
      // Validiere Grid zuerst
      this.validateGridCards(cardIds)

      // Filter leere IDs und lade echte Karten
      const realCardIds = cardIds.filter(id => id !== '')
      let realCards: BingoCard[] = []
      
      if (realCardIds.length > 0) {
        const { data, error } = await this.supabase
          .from('bingocards')
          .select('*')
          .in('id', realCardIds)
          .is('deleted_at', null)

        if (error) throw error
        realCards = data || []
      }

      // Erstelle Map für schnellen Zugriff
      const cardMap = new Map(realCards.map(card => [card.id, card]))

      // Erstelle finales Array mit Platzhaltern oder echten Karten
      return cardIds.map(id => {
        if (id === '') {
          return { ...DEFAULT_BINGO_CARD, id: '' as (UUID | '') }
        }
        const foundCard = cardMap.get(id as UUID)
        if (!foundCard) {
          console.warn(`Card with ID ${id} not found, using placeholder`)
          return { ...DEFAULT_BINGO_CARD, id: '' as (UUID | '') }
        }
        return foundCard
      })

    } catch (error) {
      console.error('Error loading cards:', error)
      throw error
    }
  }
}

export const bingoCardService = new BingoCardService() 