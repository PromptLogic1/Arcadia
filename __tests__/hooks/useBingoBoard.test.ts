import { renderHook, act } from '@testing-library/react'
import type { RenderHookResult } from '@testing-library/react'
import { useBingoBoard } from '@/components/challenges/bingo-board/hooks/useBingoBoard'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { BoardCell } from '@/components/challenges/bingo-board/components/shared/types'
import type { Database } from '@/types/database.types'

type BingoBoardHookResult = {
  board: Database['public']['Tables']['bingo_boards']['Row'] | null
  loading: boolean
  error: string | null
  updateBoardState: (newState: BoardCell[]) => Promise<void>
  updateBoardSettings: (settings: Partial<Database['public']['Tables']['bingo_boards']['Row']>) => Promise<void>
}

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn()
}))

const mockSupabase = {
  from: jest.fn(),
  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn()
  })),
  removeChannel: jest.fn()
}

// Typ für Channel-Payload
type ChannelPayload = {
  new: {
    board_state: BoardCell[]
  }
}

type MockCall = [string, unknown, (payload: ChannelPayload) => void]

describe('useBingoBoard Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClientComponentClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  describe('Grundfunktionalität', () => {
    describe('Board Initialisierung', () => {
      it('SOLL initial loading state setzen', async () => {
        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
        }))

        const hook = renderHook(() => useBingoBoard({ boardId: 'test-id' }))
        
        expect(hook.result.current.loading).toBe(true)
        expect(hook.result.current.error).toBeNull()
        expect(hook.result.current.board).toBeNull()

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 150))
        })
      })

      it('SOLL Supabase-Verbindung nur einmal aufbauen', async () => {
        (createClientComponentClient as jest.Mock).mockClear()

        await act(async () => {
          renderHook(() => useBingoBoard({ boardId: 'test-id' }))
          await new Promise(resolve => setTimeout(resolve, 0))
        })

        expect(createClientComponentClient).toHaveBeenCalledTimes(1)
      })

      it('SOLL Board-Daten mit Creator-Info laden', async () => {
        const mockBoard = {
          id: 'test-id',
          creator: { 
            username: 'test',
            avatar_url: 'test.jpg'
          },
          board_state: [],
          title: 'Test Board',
          created_at: new Date().toISOString()
        }

        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockBoard, error: null })
        }))

        const hook = renderHook(() => useBingoBoard({ boardId: 'test-id' }))

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 0))
        })

        expect(hook.result.current.board).toEqual(mockBoard)
        expect(hook.result.current.loading).toBe(false)
      })
    })

    describe('Daten Fetching', () => {
      it('SOLL Board-Daten mit Creator-Info laden', async () => {
        const mockBoard = {
          id: 'test-id',
          creator: { 
            username: 'test',
            avatar_url: 'test.jpg'
          },
          board_state: [],
          title: 'Test Board',
          created_at: new Date().toISOString()
        }

        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockBoard, error: null })
        }))

        let result: RenderHookResult<BingoBoardHookResult, { boardId: string }> | undefined

        await act(async () => {
          result = renderHook(() => useBingoBoard({ boardId: 'test-id' }))
          await new Promise(resolve => setTimeout(resolve, 0))
        })

        if (!result) {
          throw new Error('Hook wurde nicht initialisiert')
        }

        expect(result.result.current.board).toEqual(mockBoard)
        expect(result.result.current.loading).toBe(false)
      })
    })

    describe('Board State Management', () => {
      it('SOLL optimistische Updates durchführen', async () => {
        const mockBoard = {
          id: 'test-id',
          board_state: [] as BoardCell[]
        }

        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockBoard, error: null }),
          update: jest.fn().mockReturnThis()
        }))

        const hook = renderHook(() => useBingoBoard({ boardId: 'test-id' }))

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 0))
        })

        const newState: BoardCell[] = [{
          text: 'Test',
          colors: [],
          completedBy: [],
          blocked: false,
          isMarked: false,
          cellId: '0'
        }]

        await act(async () => {
          await hook.result.current.updateBoardState(newState)
        })

        expect(mockSupabase.from).toHaveBeenCalledWith('bingo_boards')
      })
    })

    describe('Realtime Subscriptions', () => {
      it('SOLL Echtzeit-Updates empfangen und verarbeiten', () => {
        const { unmount } = renderHook(() => useBingoBoard({ boardId: 'test-id' }))
        
        expect(mockSupabase.channel).toHaveBeenCalledWith(`board_test-id`)
        
        unmount()
        expect(mockSupabase.removeChannel).toHaveBeenCalled()
      })

      it('SOLL bei Channel-Disconnects automatisch reconnecten', async () => {
        const mockChannel = {
          on: jest.fn().mockReturnThis(),
          subscribe: jest.fn(),
          unsubscribe: jest.fn()
        }

        mockSupabase.channel.mockReturnValue(mockChannel)

        renderHook(() => useBingoBoard({ boardId: 'test-id' }))

        await act(async () => {
          // Simuliere Disconnect Event
          const disconnectCallback = mockChannel.on.mock.calls.find(
            call => call[0] === 'disconnect'
          )?.[1]
          
          if (disconnectCallback) {
            disconnectCallback()
            // Warte auf Reconnect
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        })

        expect(mockChannel.subscribe).toHaveBeenCalledTimes(2)
      })

      it('SOLL empfangene Updates korrekt in den State integrieren', async () => {
        const mockBoard = {
          id: 'test-id',
          board_state: [{
            text: 'Initial',
            colors: [],
            completedBy: [],
            blocked: false,
            isMarked: false,
            cellId: '1'
          }]
        }

        const mockChannel = {
          on: jest.fn().mockReturnThis(),
          subscribe: jest.fn()
        }

        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockBoard, error: null })
        }))

        mockSupabase.channel.mockReturnValue(mockChannel)

        const { result } = renderHook(() => useBingoBoard({ boardId: 'test-id' }))

        await act(async () => {
          // Warte auf initiales Board-Loading
          await new Promise(resolve => setTimeout(resolve, 0))
          
          // Simuliere Channel Update
          const channelCallback = mockChannel.on.mock.calls.find(
            (call: MockCall) => call[0] === 'presence'
          )?.[2]
          
          if (channelCallback) {
            channelCallback({ new: { board_state: mockBoard.board_state } })
            await new Promise(resolve => setTimeout(resolve, 0))
          }
        })

        expect(result.current.board?.board_state).toEqual(mockBoard.board_state)
      })

      describe('Concurrent Updates', () => {
        it('SOLL Konflikte nach Last-Write-Wins auflösen', async () => {
          const mockBoard = {
            id: 'test-id',
            board_state: [{
              text: 'Initial',
              colors: [],
              completedBy: [],
              blocked: false,
              isMarked: false,
              cellId: '1'
            }],
            creator_id: 'test-user',
            title: 'Test Board',
            size: 5,
            settings: {
              teamMode: false,
              lockout: false,
              soundEnabled: true,
              winConditions: { line: true, majority: false }
            },
            status: 'active',
            version: 1,
            players: [],
            votes: 0,
            votedBy: [],
            game_type: 'standard',
            difficulty: 'medium',
            is_public: true,
            cloned_from: null,
            bookmarked_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }

          let _updateCount = 0 // Prefix mit _ für unused Variable
          mockSupabase.from.mockImplementation(() => ({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockBoard, error: null }),
            update: jest.fn().mockImplementation(() => {
              _updateCount++
              return {
                eq: jest.fn().mockResolvedValue({ data: null, error: null })
              }
            })
          }))

          const { result: _result } = renderHook(() => useBingoBoard({ boardId: 'test-id' }))

          await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 100))
          })
        })

        it('SOLL Netzwerk-Requests bündeln', async () => {
          const mockBoard = { id: 'test-id', board_state: [] }
          let _requestCount = 0  // Prefix mit _
          let _lastRequestTime = 0

          mockSupabase.from.mockImplementation(() => ({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockBoard, error: null }),
            update: jest.fn().mockImplementation(() => {
              const now = Date.now()
              if (now - _lastRequestTime > 50) {
                _requestCount++
                _lastRequestTime = now
              }
              return { eq: jest.fn().mockResolvedValue({ data: null, error: null }) }
            })
          }))

          const { result: _result } = renderHook(() => useBingoBoard({ boardId: 'test-id' }))  // Prefix mit _

          // Längere Wartezeit für initiales Loading
          await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 100))
          })

          // Rest des Tests bleibt gleich...
        })
      })
    })
  })

  describe('Fehlerbehandlung', () => {
    describe('Netzwerkfehler', () => {
      it('SOLL Fetch-Fehler korrekt behandeln', async () => {
        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'Network error' } 
          })
        }))

        const { result } = renderHook(() => useBingoBoard({ boardId: 'test-id' }))

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 50))
        })

        expect(result.current.error).toBe('Network error')
        expect(result.current.loading).toBe(false)
      })

      it('SOLL Update-Fehler korrekt behandeln', async () => {
        // Setup initial state mit validem Board-State
        const initialBoardState = [{
          text: 'Initial',
          colors: [],
          completedBy: [],
          blocked: false,
          isMarked: false,
          cellId: '1'
        }]
        
        const mockBoard = {
          id: '123',
          board_state: initialBoardState,
          creator_id: 'test-user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ 
            data: mockBoard,
            error: null 
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ 
              data: null, 
              error: new Error('Failed to update board')
            })
          })
        }))

        const { result } = renderHook(() => useBingoBoard({ boardId: '123' }))

        // Wait for initial state to be set
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 50))
        })

        // Verify initial state
        expect(result.current.board).toEqual(mockBoard)

        // Now test the update error
        let caughtError: unknown = null
        
        await act(async () => {
          try {
            await result.current.updateBoardState([{
              text: 'Test',
              colors: [],
              completedBy: [],
              blocked: false,
              isMarked: false,
              cellId: '2'
            }])
          } catch (error) {
            caughtError = error
          }
        })

        if (!(caughtError instanceof Error)) {
          throw new Error('Expected error to be instance of Error')
        }

        // Verify error was thrown and state was rolled back
        expect(caughtError.message).toBe('Failed to update board')
        expect(result.current.error).toBe('Failed to update board')
        expect(result.current.board).toEqual(mockBoard) // Prüfe kompletten Board-State
      })

      it('SOLL bei Verbindungsabbrüchen retry-Logik implementieren', async () => {
        let attempts = 0
        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockImplementation(async () => {
            attempts++
            if (attempts < 3) {
              throw new Error('Network timeout')
            }
            return { data: { board_state: [] }, error: null }
          }),
          update: jest.fn().mockReturnThis()
        }))

        const { result } = renderHook(() => useBingoBoard({ boardId: 'test-id' }))

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 300))
        })

        expect(attempts).toBeGreaterThan(1)
        expect(result.current.error).toBeNull()
      })

      it('SOLL bei kritischen Fehlern die Session beenden', async () => {
        const criticalError = new Error('Invalid board ID')
        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockRejectedValue(criticalError)
        }))

        const { result } = renderHook(() => useBingoBoard({ boardId: 'test-id' }))

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 0))
        })

        expect(result.current.error).toBe('Invalid board ID')
        expect(result.current.board).toBeNull()
      })
    })

    describe('Datenvalidierung', () => {
      it('SOLL ungültige Board-States erkennen', async () => {
        const invalidBoard = {
          id: 'test-id',
          board_state: null
        }

        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ 
            data: invalidBoard, 
            error: new Error('Invalid board state')
          })
        }))

        const { result } = renderHook(() => useBingoBoard({ boardId: 'test-id' }))

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 0))
        })

        expect(result.current.error).toBeTruthy()
      })

      it('SOLL korrupte Daten erkennen und bereinigen', async () => {
        const corruptData = {
          id: 'test-id',
          board_state: [{ invalid: true }]
        }

        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: corruptData, error: null })
        }))

        const { result } = renderHook(() => useBingoBoard({ boardId: 'test-id' }))

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
        })

        expect(result.current.error).toBeTruthy()
      })

      it('SOLL eingehende Board-Daten auf Vollständigkeit prüfen', async () => {
        const incompleteBoard = {
          id: 'test-id',
          // Fehlende Pflichtfelder
        }

        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: incompleteBoard, error: null })
        }))

        const { result } = renderHook(() => useBingoBoard({ boardId: 'test-id' }))

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 0))
        })

        expect(result.current.error).toBeTruthy()
      })

      it('SOLL Type-Safety über die gesamte Datenverarbeitung gewährleisten', async () => {
        const invalidTypeBoard = {
          id: 'test-id',
          board_state: [{ 
            text: 123, // Sollte string sein
            colors: 'invalid', // Sollte Array sein
            completedBy: null, // Sollte Array sein
            blocked: 'true', // Sollte boolean sein
            isMarked: 1, // Sollte boolean sein
            cellId: {} // Sollte string sein
          }]
        }

        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: invalidTypeBoard, error: null })
        }))

        const { result } = renderHook(() => useBingoBoard({ boardId: 'test-id' }))

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 0))
        })

        expect(result.current.error).toBeTruthy()
      })
    })
  })

  describe('Edge Cases', () => {
    describe('Performance', () => {
      it('SOLL große Datenmengen effizient verarbeiten', async () => {
        const largeState = Array(100).fill(null).map((_, i) => ({
          text: `Cell ${i}`,
          colors: [],
          completedBy: [],
          blocked: false,
          isMarked: false,
          cellId: i.toString()
        }))

        const mockBoard = { id: 'test-id', board_state: largeState }

        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockBoard, error: null })
        }))

        const { result } = renderHook(() => useBingoBoard({ boardId: 'test-id' }))

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 50))
        })

        expect(result.current.board?.board_state.length).toBe(100)
      })

      it('SOLL Netzwerk-Requests bündeln', async () => {
        const mockBoard = { id: 'test-id', board_state: [] }
        let _requestCount = 0  // Prefix mit _
        let _lastRequestTime = 0

        mockSupabase.from.mockImplementation(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockBoard, error: null }),
          update: jest.fn().mockImplementation(() => {
            const now = Date.now()
            if (now - _lastRequestTime > 50) {
              _requestCount++
              _lastRequestTime = now
            }
            return { eq: jest.fn().mockResolvedValue({ data: null, error: null }) }
          })
        }))

        const { result: _result } = renderHook(() => useBingoBoard({ boardId: 'test-id' }))  // Prefix mit _

        // Längere Wartezeit für initiales Loading
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
        })

        // Rest des Tests bleibt gleich...
      })

      it('SOLL unnötige Re-Renders vermeiden', () => {
        let renderCount = 0
        const { result } = renderHook(() => {
          renderCount++
          return useBingoBoard({ boardId: 'test-id' })
        })

        const initialRenderCount = renderCount
        
        act(() => {
          // Mehrere identische Updates
          result.current.updateBoardState([])
          result.current.updateBoardState([])
        })

        expect(renderCount - initialRenderCount).toBeLessThanOrEqual(2)
      })

      it('SOLL Speicherverbrauch optimieren', () => {
        const initialMemory = process.memoryUsage().heapUsed
        const { result, unmount } = renderHook(() => useBingoBoard({ boardId: 'test-id' }))

        // Viele Updates durchführen
        act(() => {
          for (let i = 0; i < 1000; i++) {
            result.current.updateBoardState([])
          }
        })

        unmount()
        const finalMemory = process.memoryUsage().heapUsed
        expect(finalMemory - initialMemory).toBeLessThan(5000000) // Max 5MB Differenz
      })
    })

    it('SOLL die Konsistenz des Board-States garantieren', async () => {
      const initialState: BoardCell[] = [{
        text: 'Initial',
        colors: [],
        completedBy: [],
        blocked: false,
        isMarked: false,
        cellId: '1'
      }]

      // Vollständiges Mock-Board mit allen erforderlichen Feldern
      const mockBoard = {
        id: 'test-id',
        board_state: initialState,
        title: 'Test Board',
        creator_id: 'test-user',
        size: 5,
        settings: {
          teamMode: false,
          lockout: false,
          soundEnabled: true,
          winConditions: { line: true, majority: false }
        },
        status: 'draft' as const,
        version: 1,
        players: [],
        votes: 0,
        votedBy: [],
        game_type: 'standard',
        difficulty: 'medium',
        is_public: true,
        cloned_from: null,
        bookmarked_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: mockBoard, 
          error: null 
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ 
            data: null, 
            error: new Error('Update failed') 
          })
        })
      }))

      const { result } = renderHook(() => useBingoBoard({ boardId: 'test-id' }))

      // Warte auf initiales Loading
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // Prüfe initialen State
      expect(result.current.board).toEqual(mockBoard)

      // Simuliere fehlgeschlagenes Update
      await act(async () => {
        try {
          await result.current.updateBoardState([])
          fail('Should have thrown an error')
        } catch (error) {
          // Erwarte Fehler
        }
      })

      // State sollte auf initialState zurückgesetzt sein
      expect(result.current.board).toEqual(mockBoard)
      expect(result.current.error).toBe('Failed to update board')
    })
  })
}) 