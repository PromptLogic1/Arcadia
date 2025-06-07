/**
 * React Query Hooks Index
 *
 * This file exports all query and mutation hooks for data fetching.
 * These hooks integrate TanStack Query with our service layer.
 */

import type { FilterOptions } from '@/types';

// Filter types for better type safety
export interface SessionFilters {
  search?: string;
  status?: string;
  gameCategory?: string;
  difficulty?: string;
}

export interface CommunityFilters {
  search?: string;
  game?: string;
  challengeType?: string;
  tags?: string[];
}

export * from './useAuthQueries';
export * from './useBingoCardsQueries';
export * from './useBingoBoardsQueries';
export * from './useSessionsQueries';
export * from './useCommunityQueries';
export * from './useGameStateQueries';
export * from './useGameSettingsQueries';
export * from './usePresenceQueries';
export * from './useQueueQueries';
export * from './useCardLibraryQueries';
export * from './useSessionJoinQueries';
export * from './useSettingsQueries';
export * from './useBoardCollectionsQueries';
export * from './useUserProfileQueries';

// Export board edit queries with specific aliases to avoid conflicts
export {
  useBoardEditDataQuery,
  useBoardInitializationQuery,
  useSaveCardsMutation,
  useUpdateBoardMutation as useUpdateBoardEditMutation,
  useCreateCardMutation as useCreateBoardEditCardMutation,
  useUpdateCardMutation as useUpdateBoardEditCardMutation,
  boardEditMutations,
} from './useBingoBoardEditQueries';
// Export session state queries separately to avoid conflicts
export {
  useSessionStateQuery as useSessionStateQueryNew,
  useSessionPlayersQuery as useSessionPlayersQueryNew,
  useSessionWithPlayersQuery,
  useInitializeSessionMutation,
  useLeaveSessionMutation as useLeaveSessionMutationNew,
  useSessionState,
} from './useSessionStateQueries';

// Common query key factory functions
export const queryKeys = {
  auth: {
    session: () => ['auth', 'session'] as const,
    user: () => ['auth', 'user'] as const,
    userData: (userId: string) => ['auth', 'userData', userId] as const,
  },
  bingoCards: {
    all: () => ['bingoCards'] as const,
    byIds: (ids: string[]) => ['bingoCards', 'byIds', ...ids] as const,
    public: (filters?: FilterOptions, page?: number) =>
      ['bingoCards', 'public', filters, page] as const,
    user: (userId: string, filters?: FilterOptions, page?: number) =>
      ['bingoCards', 'user', userId, filters, page] as const,
  },
  bingoBoards: {
    all: () => ['bingoBoards'] as const,
    byId: (id: string) => ['bingoBoards', 'byId', id] as const,
    public: (filters?: FilterOptions, page?: number) =>
      ['bingoBoards', 'public', filters, page] as const,
    user: (userId: string, filters?: FilterOptions, page?: number) =>
      ['bingoBoards', 'user', userId, filters, page] as const,
  },
  sessions: {
    all: () => ['sessions'] as const,
    byId: (id: string) => ['sessions', 'byId', id] as const,
    byCode: (code: string) => ['sessions', 'byCode', code] as const,
    byBoard: (boardId: string, status?: string) =>
      ['sessions', 'byBoard', boardId, status] as const,
    active: (filters?: SessionFilters, page?: number) =>
      ['sessions', 'active', filters, page] as const,
    players: (sessionId: string) => ['sessions', 'players', sessionId] as const,
    state: (sessionId: string) => ['sessions', 'state', sessionId] as const,
    boardState: (sessionId: string) =>
      ['sessions', 'boardState', sessionId] as const,
    waitingForBoards: (boardIds: string[]) =>
      ['sessions', 'waitingForBoards', ...boardIds] as const,
  },
  gameState: {
    session: (sessionId: string) =>
      ['gameState', 'session', sessionId] as const,
    board: (sessionId: string) => ['gameState', 'board', sessionId] as const,
    results: (sessionId: string) =>
      ['gameState', 'results', sessionId] as const,
  },
  presence: {
    channel: (channelName: string) =>
      ['presence', 'channel', channelName] as const,
    user: (channelName: string, userId: string) =>
      ['presence', 'user', channelName, userId] as const,
  },
  community: {
    discussions: (filters?: CommunityFilters, page?: number) =>
      ['community', 'discussions', filters, page] as const,
    discussion: (id: string) => ['community', 'discussion', id] as const,
    comments: (discussionId: string, page?: number) =>
      ['community', 'comments', discussionId, page] as const,
    events: (filters?: CommunityFilters, page?: number) =>
      ['community', 'events', filters, page] as const,
  },
  communityEvents: {
    all: (filters?: object, page?: number) =>
      ['communityEvents', 'all', filters, page] as const,
    detail: (id: string) => ['communityEvents', 'detail', id] as const,
  },
  queue: {
    all: () => ['queue'] as const,
    status: (userId: string) => ['queue', 'status', userId] as const,
    waiting: () => ['queue', 'waiting'] as const,
  },
} as const;
