import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBingoGame } from '../hooks/useBingoGame';
import type { ReactNode } from 'react';
import type { BoardCell } from '../types';

// Create mock implementations
const mockUseSessionStateQuery = jest.fn();
const mockUseBoardStateQuery = jest.fn();
const mockUseMarkCellMutation = jest.fn();
const mockUseCompleteGameMutation = jest.fn();
const mockUseStartGameSessionMutation = jest.fn();
const mockUseGamePlayersQuery = jest.fn();

// Mock the query hooks
jest.mock('@/hooks/queries/useGameStateQueries', () => ({
  useSessionStateQuery: mockUseSessionStateQuery,
  useBoardStateQuery: mockUseBoardStateQuery,
  useMarkCellMutation: mockUseMarkCellMutation,
  useCompleteGameMutation: mockUseCompleteGameMutation,
  useStartGameSessionMutation: mockUseStartGameSessionMutation,
  useGamePlayersQuery: mockUseGamePlayersQuery,
}));

// Create mock for win detection service
const mockWinDetectionService = jest.fn().mockImplementation(() => ({
  detectWin: jest.fn(),
}));

// Mock the win detection service
jest.mock('../services/win-detection.service', () => ({
  WinDetectionService: mockWinDetectionService,
}));

import { 
  useSessionStateQuery,
  useBoardStateQuery,
  useMarkCellMutation,
  useCompleteGameMutation,
  useStartGameSessionMutation,
  useGamePlayersQuery
} from '@/hooks/queries/useGameStateQueries';
import { WinDetectionService } from '../services/win-detection.service';

describe('useBingoGame Hook', () => {
  let queryClient: QueryClient;
  const mockSessionId = 'test-session-123';

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const mockSessionData = {
    id: mockSessionId,
    board_id: 'board-123',
    host_id: 'host-user-123',
    session_code: 'ABC123',
    status: 'active' as const,
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockBoardData = {
    boardState: Array.from({ length: 25 }, (_, i) => ({
      text: `Cell ${i}`,
      colors: null,
      completed_by: null,
      blocked: false,
      is_marked: false,
      cell_id: `cell-${i}`,
      version: 1,
      last_updated: Date.now(),
      last_modified_by: null,
    } satisfies BoardCell)),
    version: 1,
  };

  const mockPlayersData = [
    {
      id: 'player-1',
      session_id: mockSessionId,
      user_id: 'user-1',
      display_name: 'Player 1',
      color: '#06b6d4',
      team: null,
      joined_at: new Date().toISOString(),
      left_at: null,
      is_host: true,
      is_ready: true,
    },
    {
      id: 'player-2',
      session_id: mockSessionId,
      user_id: 'user-2',
      display_name: 'Player 2',
      color: '#8b5cf6',
      team: null,
      joined_at: new Date().toISOString(),
      left_at: null,
      is_host: false,
      is_ready: true,
    },
  ];

  describe('Initial State', () => {
    test('should initialize with loading state', () => {
      mockUseSessionStateQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });
      mockUseBoardStateQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });
      mockUseGamePlayersQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
      });

      const { result } = renderHook(() => useBingoGame(mockSessionId), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.session).toBeUndefined();
      expect(result.current.board).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    test('should load session and board data', async () => {
      mockUseSessionStateQuery.mockReturnValue({
        data: mockSessionData,
        isLoading: false,
        error: null,
      });
      mockUseBoardStateQuery.mockReturnValue({
        data: mockBoardData,
        isLoading: false,
        error: null,
      });
      mockUseGamePlayersQuery.mockReturnValue({
        data: mockPlayersData,
        isLoading: false,
      });

      const { result } = renderHook(() => useBingoGame(mockSessionId), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.session).toEqual(mockSessionData);
      expect(result.current.board).toEqual(mockBoardData.boardState);
      expect(result.current.version).toBe(1);
      expect(result.current.error).toBeNull();
    });

    test('should handle session loading error', () => {
      const error = new Error('Failed to load session');
      mockUseSessionStateQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error,
      });
      mockUseBoardStateQuery.mockReturnValue({
        data: mockBoardData,
        isLoading: false,
        error: null,
      });
      mockUseGamePlayersQuery.mockReturnValue({
        data: mockPlayersData,
        isLoading: false,
      });

      const { result } = renderHook(() => useBingoGame(mockSessionId), { wrapper });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('An error occurred');
    });
  });

  describe('Cell Marking', () => {
    test('should mark cell successfully', async () => {
      const mockMutate = jest.fn().mockImplementation(() => Promise.resolve());
      mockUseMarkCellMutation.mockReturnValue({
        mutateAsync: mockMutate,
        isPending: false,
      });

      mockUseSessionStateQuery.mockReturnValue({
        data: mockSessionData,
        isLoading: false,
        error: null,
      });
      mockUseBoardStateQuery.mockReturnValue({
        data: mockBoardData,
        isLoading: false,
        error: null,
      });
      mockUseGamePlayersQuery.mockReturnValue({
        data: mockPlayersData,
        isLoading: false,
      });

      const { result } = renderHook(() => useBingoGame(mockSessionId), { wrapper });

      await act(async () => {
        await result.current.markCell(5, 'user-1');
      });

      expect(mockMutate).toHaveBeenCalledWith({
        sessionId: mockSessionId,
        cell_position: 5,
        user_id: 'user-1',
        action: 'mark',
        version: 1,
      });
    });

    test('should unmark cell successfully', async () => {
      const mockMutate = jest.fn().mockImplementation(() => Promise.resolve());
      mockUseMarkCellMutation.mockReturnValue({
        mutateAsync: mockMutate,
        isPending: false,
      });

      mockUseSessionStateQuery.mockReturnValue({
        data: mockSessionData,
        isLoading: false,
        error: null,
      });
      mockUseBoardStateQuery.mockReturnValue({
        data: mockBoardData,
        isLoading: false,
        error: null,
      });
      mockUseGamePlayersQuery.mockReturnValue({
        data: mockPlayersData,
        isLoading: false,
      });

      const { result } = renderHook(() => useBingoGame(mockSessionId), { wrapper });

      await act(async () => {
        await result.current.unmarkCell(5, 'user-1');
      });

      expect(mockMutate).toHaveBeenCalledWith({
        sessionId: mockSessionId,
        cell_position: 5,
        user_id: 'user-1',
        action: 'unmark',
        version: 1,
      });
    });

    test('should handle marking error gracefully', async () => {
      const mockMutate = jest.fn().mockRejectedValue(new Error('Failed to mark cell') as never);
      mockUseMarkCellMutation.mockReturnValue({
        mutateAsync: mockMutate,
        isPending: false,
      });

      mockUseSessionStateQuery.mockReturnValue({
        data: mockSessionData,
        isLoading: false,
        error: null,
      });
      mockUseBoardStateQuery.mockReturnValue({
        data: mockBoardData,
        isLoading: false,
        error: null,
      });
      mockUseGamePlayersQuery.mockReturnValue({
        data: mockPlayersData,
        isLoading: false,
      });

      const { result } = renderHook(() => useBingoGame(mockSessionId), { wrapper });

      // Should not throw
      await act(async () => {
        await result.current.markCell(5, 'user-1');
      });

      expect(mockMutate).toHaveBeenCalled();
    });
  });

  describe('Game Start', () => {
    test('should start game successfully', async () => {
      const mockMutate = jest.fn().mockImplementation(() => Promise.resolve());
      mockUseStartGameSessionMutation.mockReturnValue({
        mutateAsync: mockMutate,
        isPending: false,
      });

      mockUseSessionStateQuery.mockReturnValue({
        data: mockSessionData,
        isLoading: false,
        error: null,
      });
      mockUseBoardStateQuery.mockReturnValue({
        data: mockBoardData,
        isLoading: false,
        error: null,
      });
      mockUseGamePlayersQuery.mockReturnValue({
        data: mockPlayersData,
        isLoading: false,
      });

      const { result } = renderHook(() => useBingoGame(mockSessionId), { wrapper });

      await act(async () => {
        await result.current.startGame();
      });

      expect(mockMutate).toHaveBeenCalledWith({
        sessionId: mockSessionId,
        hostId: 'host-user-123',
      });
    });

    test('should handle missing host ID', async () => {
      mockUseSessionStateQuery.mockReturnValue({
        data: { ...mockSessionData, host_id: null },
        isLoading: false,
        error: null,
      });
      mockUseBoardStateQuery.mockReturnValue({
        data: mockBoardData,
        isLoading: false,
        error: null,
      });
      mockUseGamePlayersQuery.mockReturnValue({
        data: mockPlayersData,
        isLoading: false,
      });
      mockUseStartGameSessionMutation.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      const { result } = renderHook(() => useBingoGame(mockSessionId), { wrapper });

      await act(async () => {
        await result.current.startGame();
      });

      // Should handle the error gracefully without throwing
      // Test passes if no exception is thrown during startGame call
    });
  });

  describe('Win Detection', () => {
    test('should detect win when pattern is completed', async () => {
      const mockDetectWin = jest.fn().mockReturnValue({
        hasWin: true,
        patterns: [{
          type: 'single-line',
          name: 'Row 1',
          positions: [0, 1, 2, 3, 4],
          points: 100,
        }],
        winningCells: [0, 1, 2, 3, 4],
        totalPoints: 100,
      });

      mockWinDetectionService.mockImplementation(() => ({
        detectWin: mockDetectWin,
      }));

      const markedBoardData = {
        ...mockBoardData,
        boardState: mockBoardData.boardState.map((cell, i) => ({
          ...cell,
          is_marked: i < 5, // First row marked
        })),
      };

      mockUseSessionStateQuery.mockReturnValue({
        data: mockSessionData,
        isLoading: false,
        error: null,
      });
      mockUseBoardStateQuery.mockReturnValue({
        data: markedBoardData,
        isLoading: false,
        error: null,
      });
      mockUseGamePlayersQuery.mockReturnValue({
        data: mockPlayersData,
        isLoading: false,
      });

      const { result } = renderHook(() => useBingoGame(mockSessionId), { wrapper });

      await waitFor(() => {
        expect(result.current.winResult).toBeDefined();
      });
      
      expect(result.current.winResult?.hasWin).toBe(true);
      expect(result.current.winResult?.patterns).toHaveLength(1);
      expect(result.current.winResult?.patterns[0]?.name).toBe('Row 1');
    });

    test('should not detect win when no pattern is completed', async () => {
      const mockDetectWin = jest.fn().mockReturnValue({
        hasWin: false,
        patterns: [],
        winningCells: [],
        totalPoints: 0,
      });

      mockWinDetectionService.mockImplementation(() => ({
        detectWin: mockDetectWin,
      }));

      mockUseSessionStateQuery.mockReturnValue({
        data: mockSessionData,
        isLoading: false,
        error: null,
      });
      mockUseBoardStateQuery.mockReturnValue({
        data: mockBoardData,
        isLoading: false,
        error: null,
      });
      mockUseGamePlayersQuery.mockReturnValue({
        data: mockPlayersData,
        isLoading: false,
      });

      const { result } = renderHook(() => useBingoGame(mockSessionId), { wrapper });

      await waitFor(() => {
        expect(result.current.winResult).toBeDefined();
      });
      
      expect(result.current.winResult?.hasWin).toBe(false);
      expect(result.current.winResult?.patterns).toHaveLength(0);
    });
  });

  describe('Game Completion', () => {
    test('should complete game with winner', async () => {
      const mockMutate = jest.fn().mockImplementation(() => Promise.resolve());
      mockUseCompleteGameMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });

      mockUseSessionStateQuery.mockReturnValue({
        data: mockSessionData,
        isLoading: false,
        error: null,
      });
      mockUseBoardStateQuery.mockReturnValue({
        data: mockBoardData,
        isLoading: false,
        error: null,
      });
      mockUseGamePlayersQuery.mockReturnValue({
        data: mockPlayersData,
        isLoading: false,
      });

      const { result } = renderHook(() => useBingoGame(mockSessionId), { wrapper });

      act(() => {
        result.current.handleCompleteGame('user-1');
      });

      expect(mockMutate).toHaveBeenCalledWith({
        sessionId: mockSessionId,
        data: {
          winner_id: 'user-1',
          winning_patterns: [],
          final_score: 100,
          players: mockPlayersData,
        },
      });
    });

    test('should not complete game without session data', () => {
      const mockMutate = jest.fn();
      mockUseCompleteGameMutation.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      });

      mockUseSessionStateQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      });
      mockUseBoardStateQuery.mockReturnValue({
        data: mockBoardData,
        isLoading: false,
        error: null,
      });
      mockUseGamePlayersQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
      });

      const { result } = renderHook(() => useBingoGame(mockSessionId), { wrapper });

      act(() => {
        result.current.handleCompleteGame('user-1');
      });

      expect(mockMutate).not.toHaveBeenCalled();
    });
  });

  describe('Loading States', () => {
    test('should track individual operation loading states', () => {
      mockUseMarkCellMutation.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: true,
      });
      mockUseStartGameSessionMutation.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: true,
      });
      mockUseCompleteGameMutation.mockReturnValue({
        mutate: jest.fn(),
        isPending: true,
      });

      mockUseSessionStateQuery.mockReturnValue({
        data: mockSessionData,
        isLoading: false,
        error: null,
      });
      mockUseBoardStateQuery.mockReturnValue({
        data: mockBoardData,
        isLoading: false,
        error: null,
      });
      mockUseGamePlayersQuery.mockReturnValue({
        data: mockPlayersData,
        isLoading: false,
      });

      const { result } = renderHook(() => useBingoGame(mockSessionId), { wrapper });

      expect(result.current.isMarkingCell).toBe(true);
      expect(result.current.isStartingGame).toBe(true);
      expect(result.current.isCompleting).toBe(true);
    });
  });
});