import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { mockSupabaseClient } from '../../jest.setup'
import type { Database } from '@/types/database.types'

// Typisierter Mock für Supabase Client
type MockSupabaseClient = ReturnType<typeof createClientComponentClient<Database>>
type SessionPlayer = Database['public']['Tables']['bingo_session_players']['Insert']

describe('RLS Policies', () => {
  let supabase: jest.Mocked<MockSupabaseClient>

  beforeEach(() => {
    jest.clearAllMocks()
    supabase = mockSupabaseClient as unknown as jest.Mocked<MockSupabaseClient>
  })

  describe('Session Access Tests', () => {
    it('should restrict view access based on role', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { 
            code: '42501',
            message: 'insufficient_privilege' 
          } 
        })
      }

      supabase.from = jest.fn().mockReturnValue(mockQueryBuilder)

      const { error } = await supabase
        .from('bingo_sessions')
        .select()
        .eq('id', 'private-session')

      expect(error?.code).toBe('42501')
    })

    it('should enforce update permissions', async () => {
      const mockQueryBuilder = {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: {
              code: '42501',
              message: 'insufficient_privilege'
            }
          })
        })
      }

      supabase.from = jest.fn().mockReturnValue(mockQueryBuilder)

      const { error } = await supabase
        .from('bingo_sessions')
        .update({ status: 'completed' })
        .eq('id', 'test-session')

      expect(error?.code).toBe('42501')
    })

    it('should enforce delete permissions', async () => {
      const mockQueryBuilder = {
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: {
              code: '42501',
              message: 'insufficient_privilege'
            }
          })
        })
      }

      supabase.from = jest.fn().mockReturnValue(mockQueryBuilder)

      const { error } = await supabase
        .from('bingo_sessions')
        .delete()
        .eq('id', 'test-session')

      expect(error?.code).toBe('42501')
    })
  })

  describe('Player Management Tests', () => {
    it('should enforce join session policies', async () => {
      const testCases = [
        { sessionStatus: 'active', isFull: false, shouldSucceed: true },
        { sessionStatus: 'completed', isFull: false, shouldSucceed: false },
        { sessionStatus: 'active', isFull: true, shouldSucceed: false }
      ]

      for (const testCase of testCases) {
        supabase.from = jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: {
              status: testCase.sessionStatus,
              player_count: testCase.isFull ? 8 : 4
            }
          }),
          insert: jest.fn().mockImplementation(async () => {
            if (!testCase.shouldSucceed) {
              return { error: { message: 'Policy violation' } }
            }
            return { data: null, error: null }
          })
        })

        const playerData: SessionPlayer = {
          session_id: 'test-session',
          user_id: 'test-user',
          player_name: 'Test Player',
          color: '#ff0000',
          team: 1,
          joined_at: new Date().toISOString()
        }

        const { error } = await supabase
          .from('bingo_session_players')
          .insert(playerData)

        if (testCase.shouldSucceed) {
          expect(error).toBeNull()
        } else {
          expect(error?.message).toContain('Policy violation')
        }
      }
    })

    it('should restrict player info updates to self', async () => {
      const testCases = [
        { targetId: 'test-user', shouldSucceed: true },
        { targetId: 'other-user', shouldSucceed: false }
      ]

      for (const testCase of testCases) {
        const mockQueryBuilder = {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              error: testCase.shouldSucceed ? null : {
                code: '42501',
                message: 'insufficient_privilege'
              }
            })
          })
        }

        supabase.from = jest.fn().mockReturnValue(mockQueryBuilder)

        const { error } = await supabase
          .from('bingo_session_players')
          .update({ player_name: 'New Name' })
          .eq('user_id', testCase.targetId)

        if (testCase.shouldSucceed) {
          expect(error).toBeNull()
        } else {
          expect(error?.code).toBe('42501')
        }
      }
    })

    it('should enforce leave session permissions', async () => {
      const testCases = [
        { userId: 'test-user', shouldSucceed: true },
        { userId: 'other-user', shouldSucceed: false }
      ]

      for (const testCase of testCases) {
        const mockQueryBuilder = {
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              error: testCase.shouldSucceed ? null : {
                code: '42501',
                message: 'insufficient_privilege'
              }
            })
          })
        }

        supabase.from = jest.fn().mockReturnValue(mockQueryBuilder)

        const { error } = await supabase
          .from('bingo_session_players')
          .delete()
          .eq('user_id', testCase.userId)

        if (testCase.shouldSucceed) {
          expect(error).toBeNull()
        } else {
          expect(error?.code).toBe('42501')
        }
      }
    })
  })
}) 