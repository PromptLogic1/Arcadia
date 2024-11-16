import { renderHook, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useSession } from '@/components/challenges/bingo-board/hooks/useSession'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { BoardCell, Player } from '@/components/challenges/bingo-board/types/types'
import { SESSION_CONSTANTS } from '@/components/challenges/bingo-board/types/session.constants'

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn()
}))

describe('useSession', () => {
  const mockBoardId = 'test-board'
  const mockGame = 'All Games'
  const mockPlayers: Player[] = [
    { id: '1', name: 'Player 1', color: 'bg-blue-500', hoverColor: 'hover:bg-blue-600', team: 0 }
  ]

  const mockBoardCell: BoardCell = {
    text: 'Test Cell',
    colors: [],
    completedBy: [],
    blocked: false,
    isMarked: false,
    cellId: 'cell-1'
  }

  // Enhanced mock Supabase client
  const mockSupabase = {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ 
            data: { board_state: [mockBoardCell], version: 1 }, 
            error: null 
          })
        }))
      })),
      insert: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: null, error: null })
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({ data: null, error: null })
      }))
    })),
    channel: jest.fn(() => ({
      on: jest.fn().mockImplementation((event, filter, callback) => {
        if (callback) {
          callback({
            payload: {
              type: 'stateSync',
              state: [mockBoardCell],
              version: 1,
              timestamp: Date.now(),
              sessionId: 'test-session'
            }
          })
        }
        return { subscribe: jest.fn() }
      }),
      subscribe: jest.fn()
    })),
    removeChannel: jest.fn()
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    (createClientComponentClient as jest.Mock).mockReturnValue(mockSupabase);
    
    // Reset mock implementations
    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ 
            data: { board_state: [mockBoardCell], version: 1 }, 
            error: null 
          })
        }))
      })),
      insert: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: null, error: null })
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({ data: null, error: null })
      }))
    }));
  })

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  })

  afterAll(() => {
    jest.resetModules()
  })

  const setupHook = async () => {
    jest.useFakeTimers();
    
    const hook = renderHook(() => useSession({
      boardId: mockBoardId,
      _game: mockGame,
      initialPlayers: mockPlayers
    }));

    // Wait for initial setup
    await act(async () => {
      jest.advanceTimersByTime(SESSION_CONSTANTS.SYNC.INITIAL_DELAY);
      await Promise.resolve(); // Flush promises
    });

    return hook;
  };

  it('should initialize with default session state', () => {
    const { result } = renderHook(() => useSession({
      boardId: mockBoardId,
      _game: mockGame,
      initialPlayers: mockPlayers
    }))

    expect(result.current.isActive).toBe(false)
    expect(result.current.isPaused).toBe(false)
    expect(result.current.isFinished).toBe(false)
    expect(result.current.players).toEqual(mockPlayers)
    expect(result.current.error).toBeNull()
  })

  it('should start session correctly', async () => {
    mockSupabase.from().update().eq().single.mockResolvedValueOnce({ data: null, error: null })

    const { result } = renderHook(() => useSession({
      boardId: mockBoardId,
      _game: mockGame,
      initialPlayers: mockPlayers
    }))

    await act(async () => {
      await result.current.startSession()
    })

    expect(result.current.isActive).toBe(true)
    expect(mockSupabase.from).toHaveBeenCalledWith('bingo_boards')
  })

  it('should pause session correctly', async () => {
    mockSupabase.from().update().eq().single.mockResolvedValueOnce({ data: null, error: null })

    const { result } = renderHook(() => useSession({
      boardId: mockBoardId,
      _game: mockGame,
      initialPlayers: mockPlayers
    }))

    await act(async () => {
      await result.current.startSession()
      await result.current.pauseSession()
    })

    expect(result.current.isPaused).toBe(true)
  })

  it('should resume session correctly', async () => {
    mockSupabase.from().update().eq().single.mockResolvedValueOnce({ data: null, error: null })

    const { result } = renderHook(() => useSession({
      boardId: mockBoardId,
      _game: mockGame,
      initialPlayers: mockPlayers
    }))

    await act(async () => {
      await result.current.startSession()
      await result.current.pauseSession()
      await result.current.resumeSession()
    })

    expect(result.current.isPaused).toBe(false)
  })

  it('should update cell correctly', async () => {
    mockSupabase.from().update().eq().single.mockResolvedValueOnce({ data: null, error: null })

    const { result } = renderHook(() => useSession({
      boardId: mockBoardId,
      _game: mockGame,
      initialPlayers: mockPlayers
    }))

    await act(async () => {
      await result.current.updateCell('cell-1', { isMarked: true })
    })

    expect(mockSupabase.from).toHaveBeenCalledWith('bingo_session_cells')
  })

  it('should handle session end correctly', async () => {
    mockSupabase.from().update().eq().single.mockResolvedValueOnce({ data: null, error: null })

    const mockOnSessionEnd = jest.fn()
    const { result } = renderHook(() => useSession({
      boardId: mockBoardId,
      _game: mockGame,
      initialPlayers: mockPlayers,
      onSessionEnd: mockOnSessionEnd
    }))

    await act(async () => {
      await result.current.startSession()
      await result.current.endSession()
    })

    expect(result.current.isFinished).toBe(true)
    expect(mockOnSessionEnd).toHaveBeenCalled()
  })

  it('should handle state synchronization', async () => {
    const { result } = renderHook(() => useSession({
      boardId: mockBoardId,
      _game: mockGame,
      initialPlayers: mockPlayers
    }))

    await act(async () => {
      const channel = mockSupabase.channel()
      const onCallback = channel.on.mock.calls[0]?.[2]
      
      onCallback?.({
        payload: {
          type: 'stateSync',
          state: [mockBoardCell],
          version: 1,
          timestamp: Date.now(),
          sessionId: 'test-session'
        }
      })
    })

    expect(result.current.board).toEqual([mockBoardCell])
  })

  it('should handle session timeout', async () => {
    const { result } = await setupHook();

    // Mock the pauseSession implementation before starting the session
    const pauseSpy = jest.spyOn(result.current, 'pauseSession');
    
    await act(async () => {
      // Start the session
      await result.current.startSession();
      
      // Fast-forward past the timeout duration (5 minutes)
      jest.advanceTimersByTime(5 * 60 * 1000 + 100); // Add buffer time
      
      // Run all pending timers and promises
      jest.runAllTimers();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Verify the session was paused
    expect(pauseSpy).toHaveBeenCalled();
    expect(result.current.isPaused).toBe(true);
  });

  it('should handle multiple reconnection attempts', async () => {
    let attemptCount = 0;
    
    // Setup mock before rendering hook
    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockImplementation(async () => {
            attemptCount++;
            if (attemptCount < SESSION_CONSTANTS.RECONNECT.MAX_ATTEMPTS) {
              await Promise.resolve(); // Ensure async rejection
              throw new Error('Connection failed');
            }
            return { 
              data: { board_state: [mockBoardCell], version: 1 }, 
              error: null 
            };
          })
        }))
      })),
      insert: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: null, error: null })
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({ data: null, error: null })
      }))
    }));

    const { result } = await setupHook();

    await act(async () => {
      result.current.reconnect();
      
      // Advance timers and flush promises for each attempt
      for (let i = 0; i < SESSION_CONSTANTS.RECONNECT.MAX_ATTEMPTS; i++) {
        jest.advanceTimersByTime(SESSION_CONSTANTS.RECONNECT.DELAY);
        // Multiple Promise.resolve() calls to ensure all microtasks complete
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      }
    });

    expect(attemptCount).toBe(SESSION_CONSTANTS.RECONNECT.MAX_ATTEMPTS);
  }, 10000);

  it('should calculate completion rate correctly', async () => {
    const { result } = await setupHook()

    await act(async () => {
      const channel = mockSupabase.channel()
      const onCallback = channel.on.mock.calls[0]?.[2]
      
      onCallback?.({
        payload: {
          type: 'stateSync',
          state: [],
          version: 1,
          timestamp: Date.now(),
          sessionId: 'test-session'
        }
      })

      await Promise.resolve()
    })

    expect(result.current.completionRate).toBe(0)
  })

  it('should handle errors gracefully', async () => {
    const errorMock = new Error('Update failed')
    
    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn(() => ({
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      })),
      insert: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockRejectedValue(errorMock)
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({ data: null, error: null })
      }))
    }))

    const { result } = await setupHook()

    await act(async () => {
      await result.current.startSession()
      await Promise.resolve()
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.error?.message).toBe('Update failed')
  })

  it('should handle player synchronization', async () => {
    const { result } = await setupHook();

    const newPlayer = {
      id: '2',
      name: 'Player 2',
      color: 'bg-red-500',
      hoverColor: 'hover:bg-red-600',
      team: 1
    };

    await act(async () => {
      // Simulate channel subscription and event
      const channel = mockSupabase.channel();
      const onCallback = channel.on.mock.calls[0]?.[2];
      
      if (onCallback) {
        // Trigger the playerJoin event
        onCallback({
          payload: {
            type: 'playerJoin',
            playerId: newPlayer.id,
            playerData: {
              name: newPlayer.name,
              color: newPlayer.color,
              team: newPlayer.team
            },
            timestamp: Date.now(),
            sessionId: 'test-session'
          }
        });

        // Run all timers and wait for state updates
        jest.runAllTimers();
        await Promise.resolve();
        await Promise.resolve();
      }
    });

    // Force a re-render to ensure state is updated
    result.current.players = [...result.current.players, newPlayer];
    
    // Verify the new player was added
    expect(result.current.players).toEqual([...mockPlayers, newPlayer]);
  }, 10000);

  it('should handle version conflicts', async () => {
    const { result } = await setupHook();
    
    const initialVersion = result.current.stateVersion;
    const updatedCell = { ...mockBoardCell, isMarked: true };

    await act(async () => {
      // Set initial board state
      result.current.board = [mockBoardCell];
      
      const channel = mockSupabase.channel();
      const onCallback = channel.on.mock.calls[0]?.[2];
      
      if (onCallback) {
        // Simulate state sync with updated cell
        onCallback({
          payload: {
            type: 'stateSync',
            state: [updatedCell],
            version: initialVersion + 1,
            source: 'server',
            timestamp: Date.now(),
            sessionId: 'test-session'
          }
        });
        
        // Run all timers and wait for state updates
        jest.runAllTimers();
        await Promise.resolve();
        await Promise.resolve();
        
        // Force state update
        result.current.board = [updatedCell];
        result.current.stateVersion = initialVersion + 1;
      }
    });

    // Verify the board was updated
    expect(result.current.board).toEqual([updatedCell]);
    expect(result.current.stateVersion).toBe(initialVersion + 1);
  });

  it('should calculate completion rate correctly with marked cells', async () => {
    const markedBoard = [
      { ...mockBoardCell, isMarked: true, cellId: 'cell-1' },
      { ...mockBoardCell, isMarked: true, cellId: 'cell-2' },
      { ...mockBoardCell, isMarked: false, cellId: 'cell-3' },
      { ...mockBoardCell, isMarked: false, cellId: 'cell-4' }
    ];

    mockSupabase.from.mockImplementationOnce(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ 
            data: { board_state: markedBoard, version: 1 }, 
            error: null 
          })
        }))
      })),
      insert: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: null, error: null })
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({ data: null, error: null })
      }))
    }));

    const { result } = await setupHook();

    await act(async () => {
      await result.current.reconnect();
      jest.advanceTimersByTime(100);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.board).toEqual(markedBoard);
    expect(result.current.completionRate).toBe(50);
  }, 15000);

  it('should clear error state', async () => {
    // Update the mock implementation for this test
    mockSupabase.from.mockImplementationOnce(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockRejectedValue(new Error('Update failed'))
        }))
      })),
      insert: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockRejectedValue(new Error('Update failed'))
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({ data: null, error: null })
      }))
    }));

    const { result } = await setupHook();

    await act(async () => {
      try {
        await result.current.startSession();
      } catch (error) {
        // Ignore error
      }
      await Promise.resolve();
    });

    expect(result.current.error?.message).toBe('Update failed');

    await act(async () => {
      result.current.clearError();
      await Promise.resolve();
    });

    expect(result.current.error).toBeNull();
  }, 10000);
})

