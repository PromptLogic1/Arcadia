/**
 * React Query Hooks Index
 * 
 * This file exports all query and mutation hooks for data fetching.
 * These hooks integrate TanStack Query with our service layer.
 */

export * from './useAuthQueries';
export * from './useBingoCardsQueries';
export * from './useBingoBoardsQueries';
export * from './useSessionsQueries';
export * from './useCommunityQueries';

// Common query key factory functions
export const queryKeys = {
  auth: {
    user: () => ['auth', 'user'] as const,
    userData: (userId: string) => ['auth', 'userData', userId] as const,
  },
  bingoCards: {
    all: () => ['bingoCards'] as const,
    byIds: (ids: string[]) => ['bingoCards', 'byIds', ...ids] as const,
    public: (filters?: any, page?: number) => ['bingoCards', 'public', filters, page] as const,
    user: (userId: string, filters?: any, page?: number) => ['bingoCards', 'user', userId, filters, page] as const,
  },
  bingoBoards: {
    all: () => ['bingoBoards'] as const,
    byId: (id: string) => ['bingoBoards', 'byId', id] as const,
    public: (filters?: any, page?: number) => ['bingoBoards', 'public', filters, page] as const,
    user: (userId: string, filters?: any, page?: number) => ['bingoBoards', 'user', userId, filters, page] as const,
  },
  sessions: {
    all: () => ['sessions'] as const,
    byId: (id: string) => ['sessions', 'byId', id] as const,
    byCode: (code: string) => ['sessions', 'byCode', code] as const,
    active: (filters?: any, page?: number) => ['sessions', 'active', filters, page] as const,
    players: (sessionId: string) => ['sessions', 'players', sessionId] as const,
  },
  community: {
    discussions: (filters?: any, page?: number) => ['community', 'discussions', filters, page] as const,
    discussion: (id: string) => ['community', 'discussion', id] as const,
    comments: (discussionId: string, page?: number) => ['community', 'comments', discussionId, page] as const,
    events: (filters?: any, page?: number) => ['community', 'events', filters, page] as const,
  },
} as const;