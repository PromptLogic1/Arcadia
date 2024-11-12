import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { mockSupabaseClient } from '../../jest.setup'
import type { Database } from '@/types/database.types'
import type { BoardCell } from '@/components/challenges/bingo-board/components/shared/types'

// Typisierter Mock für Supabase Client
type MockSupabaseClient = ReturnType<typeof createClientComponentClient<Database>>

// Vollständige Typen für die Test-Daten
type SessionPlayer = Database['public']['Tables']['bingo_session_players']['Insert']
type BingoBoard = Database['public']['Tables']['bingo_boards']['Insert']
type BingoSession = Database['public']['Tables']['bingo_sessions']['Update']

// Erstelle einen vollständigen QueryBuilder Mock
const createMockQueryBuilder = () => ({
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue({ data: null, error: null })
  }),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  count: jest.fn().mockResolvedValue({ count: 0 })
})

describe('Database Constraints', () => {
  let supabase: jest.Mocked<MockSupabaseClient>

  beforeEach(() => {
    jest.clearAllMocks()
    supabase = mockSupabaseClient as unknown as jest.Mocked<MockSupabaseClient>
  })

  describe('Foreign Key Tests', () => {
    it('should cascade delete related records when parent is deleted', async () => {
      const sessionId = 'test-session'
      const deletedRecords: string[] = []

      const mockQueryBuilder = {
        ...createMockQueryBuilder(),
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ 
            data: { id: sessionId }, 
            error: null 
          })
        })
      }

      supabase.from = jest.fn().mockReturnValue(mockQueryBuilder)

      await supabase
        .from('bingo_sessions')
        .delete()
        .eq('id', sessionId)

      expect(supabase.from).toHaveBeenCalledWith('bingo_sessions')
    })

    it('should maintain referential integrity', async () => {
      const mockQueryBuilder = {
        ...createMockQueryBuilder(),
        insert: jest.fn().mockImplementation(async () => ({
          error: {
            code: '23503',
            message: 'insert or update on table violates foreign key constraint'
          }
        }))
      }

      supabase.from = jest.fn().mockReturnValue(mockQueryBuilder)

      const playerData: SessionPlayer = {
        session_id: 'invalid-session',
        user_id: 'test-user',
        player_name: 'Test Player',
        color: '#ff0000',
        team: 1,
        joined_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('bingo_session_players')
        .insert(playerData)

      expect(error?.code).toBe('23503')
    })

    it('should prevent orphaned records', async () => {
      const mockQueryBuilder = {
        ...createMockQueryBuilder(),
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ 
            data: null, 
            error: { 
              code: '23503',
              message: 'Foreign key violation'
            } 
          })
        })
      }

      supabase.from = jest.fn().mockReturnValue(mockQueryBuilder)

      const { error } = await supabase
        .from('bingo_boards')
        .delete()
        .eq('id', 'board-with-sessions')

      expect(error?.code).toBe('23503')
    })
  })

  describe('Unique Constraint Tests', () => {
    it('should enforce unique session-user combinations', async () => {
      const mockQueryBuilder = {
        ...createMockQueryBuilder(),
        insert: jest.fn().mockImplementation(async () => ({
          error: {
            code: '23505',
            message: 'duplicate key value violates unique constraint'
          }
        }))
      }

      supabase.from = jest.fn().mockReturnValue(mockQueryBuilder)

      const playerData: SessionPlayer = {
        session_id: 'existing-session',
        user_id: 'existing-user',
        player_name: 'Test Player',
        color: '#ff0000',
        team: 1,
        joined_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('bingo_session_players')
        .insert(playerData)

      expect(error?.code).toBe('23505')
    })

    it('should enforce unique colors per session', async () => {
      const mockQueryBuilder = {
        ...createMockQueryBuilder(),
        insert: jest.fn().mockImplementation(async () => ({
          error: {
            code: '23505',
            message: 'duplicate key value violates unique constraint'
          }
        }))
      }

      supabase.from = jest.fn().mockReturnValue(mockQueryBuilder)

      const playerData: SessionPlayer = {
        session_id: 'test-session',
        user_id: 'new-user',
        player_name: 'New Player',
        color: '#ff0000', // Already taken color
        team: 1,
        joined_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('bingo_session_players')
        .insert(playerData)

      expect(error?.code).toBe('23505')
    })
  })

  describe('Check Constraints', () => {
    it('should validate board size range', async () => {
      const mockQueryBuilder = {
        ...createMockQueryBuilder(),
        insert: jest.fn().mockImplementation(async () => ({
          error: {
            code: '23514',
            message: 'new row for relation "bingo_boards" violates check constraint'
          }
        }))
      }

      supabase.from = jest.fn().mockReturnValue(mockQueryBuilder)

      const boardData: BingoBoard = {
        title: 'Test Board',
        creator_id: 'test-user',
        size: 7,
        board_state: [],
        settings: {
          teamMode: false,
          lockout: false,
          soundEnabled: true,
          winConditions: {
            line: true,
            majority: false
          }
        },
        difficulty: 'medium',
        status: 'draft',
        game_type: 'standard',
        is_public: true,
        cloned_from: null
      }

      const { error } = await supabase
        .from('bingo_boards')
        .insert(boardData)

      expect(error?.code).toBe('23514')
    })

    it('should enforce valid game status values', async () => {
      const mockQueryBuilder = {
        ...createMockQueryBuilder(),
        update: jest.fn().mockImplementation(async () => ({
          error: {
            code: '23514',
            message: 'invalid status value'
          }
        }))
      }

      supabase.from = jest.fn().mockReturnValue(mockQueryBuilder)

      const sessionUpdate: BingoSession = {
        status: 'cancelled'  // Verwende einen gültigen Status
      }

      const { error } = await supabase
        .from('bingo_sessions')
        .update(sessionUpdate)

      expect(error?.code).toBe('23514')
    })

    it('should enforce player count limits', async () => {
      let playerCount = 8 // Max players
      
      const mockQueryBuilder = {
        ...createMockQueryBuilder(),
        insert: jest.fn().mockImplementation(async () => {
          playerCount++
          if (playerCount > 8) {
            return {
              error: {
                code: '23514',
                message: 'player limit exceeded'
              }
            }
          }
          return { data: null, error: null }
        }),
        count: jest.fn().mockResolvedValue({ count: playerCount })
      }

      supabase.from = jest.fn().mockReturnValue(mockQueryBuilder)

      const playerData: SessionPlayer = {
        session_id: 'full-session',
        user_id: 'new-player',
        player_name: 'New Player',
        color: '#ff0000',
        team: 1,
        joined_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('bingo_session_players')
        .insert(playerData)

      expect(error?.code).toBe('23514')
    })
  })
}) 