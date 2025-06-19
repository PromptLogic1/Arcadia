import { describe, test, expect, beforeEach } from '@jest/globals';
import type { Enums } from '@/types/database.types';
import type {
  SessionFilters,
  SessionWithStats,
} from '@/services/sessions.service';

// Types for session filtering (aligned with actual implementation)
type GameCategory = Enums<'game_category'>;
// Keeping for potential future use
// type _Difficulty = Enums<'difficulty_level'>;
// type _SessionStatus = Enums<'session_status'>;

interface SessionSortOptions {
  sortBy: 'created_at' | 'current_player_count' | 'board_title';
  order?: 'asc' | 'desc';
}

// Session filtering logic extracted from E2E tests
export const filterSessions = (
  sessions: SessionWithStats[],
  filters: SessionFilters
): SessionWithStats[] => {
  let filtered = [...sessions];

  // Game category filter
  if (filters.gameCategory) {
    filtered = filtered.filter(
      session => session.board_game_type === filters.gameCategory
    );
  }

  // Difficulty filter
  if (filters.difficulty) {
    filtered = filtered.filter(
      session => session.board_difficulty === filters.difficulty
    );
  }

  // Search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(
      session =>
        (session.board_title ?? '').toLowerCase().includes(searchLower) ||
        (session.host_username ?? '').toLowerCase().includes(searchLower)
    );
  }

  // Status filter
  if (filters.status && filters.status !== 'all') {
    if (filters.status === 'active') {
      filtered = filtered.filter(session => session.status === 'active');
    } else if (filters.status === 'waiting') {
      filtered = filtered.filter(session => session.status === 'waiting');
    }
  }

  // Private session filter
  if (filters.showPrivate === false) {
    filtered = filtered.filter(session => !session.has_password);
  }

  return filtered;
};

// Sort sessions by different criteria
export const sortSessions = (
  sessions: SessionWithStats[],
  options: SessionSortOptions
): SessionWithStats[] => {
  const sorted = [...sessions];
  const { sortBy, order = 'desc' } = options;

  switch (sortBy) {
    case 'current_player_count':
      return sorted.sort((a, b) => {
        const diff =
          (b.current_player_count ?? 0) - (a.current_player_count ?? 0);
        return order === 'asc' ? -diff : diff;
      });

    case 'created_at':
      return sorted.sort((a, b) => {
        const aTime = new Date(a.created_at ?? 0).getTime();
        const bTime = new Date(b.created_at ?? 0).getTime();
        const diff = bTime - aTime;
        return order === 'asc' ? -diff : diff;
      });

    case 'board_title':
      return sorted.sort((a, b) => {
        const diff = (a.board_title ?? '').localeCompare(b.board_title ?? '');
        return order === 'asc' ? diff : -diff;
      });

    default:
      return sorted;
  }
};

// Combined filter and sort
export const filterAndSortSessions = (
  sessions: SessionWithStats[],
  filters: SessionFilters,
  sortOptions: SessionSortOptions
): SessionWithStats[] => {
  const filtered = filterSessions(sessions, filters);
  return sortSessions(filtered, sortOptions);
};

describe('Session Filtering Logic', () => {
  let mockSessions: SessionWithStats[];

  beforeEach(() => {
    mockSessions = [
      {
        id: 'session-1',
        board_id: 'board-1',
        board_title: 'Classic Bingo',
        board_game_type: 'Minecraft',
        board_difficulty: 'easy',
        host_id: 'host-1',
        host_username: 'PlayerOne',
        status: 'waiting',
        current_player_count: 2,
        max_players: 4,
        has_password: false,
        created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        updated_at: new Date().toISOString(),
        session_code: 'ABC123',
        started_at: null,
        ended_at: null,
        winner_id: null,
        current_state: null,
        settings: null,
        version: 1,
      },
      {
        id: 'session-2',
        board_id: 'board-2',
        board_title: 'Speed Challenge',
        board_game_type: 'Valorant',
        board_difficulty: 'hard',
        host_id: 'host-2',
        host_username: 'SpeedRunner',
        status: 'active',
        current_player_count: 6,
        max_players: 8,
        has_password: true,
        created_at: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
        updated_at: new Date().toISOString(),
        session_code: 'XYZ789',
        started_at: new Date(Date.now() - 600000).toISOString(),
        ended_at: null,
        winner_id: null,
        current_state: null,
        settings: null,
        version: 2,
      },
      {
        id: 'session-3',
        board_id: 'board-3',
        board_title: 'Casual Fun',
        board_game_type: 'Among Us',
        board_difficulty: 'medium',
        host_id: 'host-3',
        host_username: 'CasualGamer',
        status: 'waiting',
        current_player_count: 1,
        max_players: 6,
        has_password: false,
        created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        updated_at: new Date().toISOString(),
        session_code: 'DEF456',
        started_at: null,
        ended_at: null,
        winner_id: null,
        current_state: null,
        settings: null,
        version: 1,
      },
    ];
  });

  describe('Category Filtering', () => {
    test('should filter sessions by game category', () => {
      const filtered = filterSessions(mockSessions, {
        gameCategory: 'Minecraft',
      });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.board_title).toBe('Classic Bingo');
    });

    test('should return all sessions when no category filter', () => {
      const filtered = filterSessions(mockSessions, {});
      expect(filtered).toHaveLength(3);
    });
  });

  describe('Difficulty Filtering', () => {
    test('should filter sessions by difficulty level', () => {
      const filtered = filterSessions(mockSessions, { difficulty: 'hard' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.board_title).toBe('Speed Challenge');
    });

    test('should handle medium difficulty filter', () => {
      const filtered = filterSessions(mockSessions, { difficulty: 'medium' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.board_title).toBe('Casual Fun');
    });
  });

  describe('Search Filtering', () => {
    test('should filter by board title', () => {
      const filtered = filterSessions(mockSessions, { search: 'speed' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.board_title).toBe('Speed Challenge');
    });

    test('should filter by host username', () => {
      const filtered = filterSessions(mockSessions, { search: 'casual' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.host_username).toBe('CasualGamer');
    });

    test('should be case insensitive', () => {
      const filtered = filterSessions(mockSessions, { search: 'CLASSIC' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.board_title).toBe('Classic Bingo');
    });
  });

  describe('Status Filtering', () => {
    test('should filter active sessions', () => {
      const filtered = filterSessions(mockSessions, { status: 'active' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.status).toBe('active');
    });

    test('should filter waiting sessions', () => {
      const filtered = filterSessions(mockSessions, { status: 'waiting' });
      expect(filtered).toHaveLength(2);
      filtered.forEach(session => {
        expect(session.status).toBe('waiting');
      });
    });

    test('should return all sessions when status is "all"', () => {
      const filtered = filterSessions(mockSessions, { status: 'all' });
      expect(filtered).toHaveLength(3);
    });
  });

  describe('Privacy Filtering', () => {
    test('should exclude private sessions when showPrivate is false', () => {
      const filtered = filterSessions(mockSessions, { showPrivate: false });
      expect(filtered).toHaveLength(2);
      filtered.forEach(session => {
        expect(session.has_password).toBe(false);
      });
    });

    test('should include private sessions when showPrivate is true', () => {
      const filtered = filterSessions(mockSessions, { showPrivate: true });
      expect(filtered).toHaveLength(3);
    });
  });

  describe('Combined Filters', () => {
    test('should apply multiple filters together', () => {
      const filtered = filterSessions(mockSessions, {
        status: 'waiting',
        difficulty: 'easy',
        showPrivate: false,
      });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.board_title).toBe('Classic Bingo');
    });

    test('should return empty array when no sessions match all filters', () => {
      const filtered = filterSessions(mockSessions, {
        gameCategory: 'Minecraft',
        status: 'active',
        difficulty: 'hard',
      });
      expect(filtered).toHaveLength(0);
    });
  });

  describe('Session Sorting', () => {
    test('should sort by player count descending', () => {
      const sorted = sortSessions(mockSessions, {
        sortBy: 'current_player_count',
        order: 'desc',
      });
      expect(sorted[0]?.current_player_count).toBe(6);
      expect(sorted[1]?.current_player_count).toBe(2);
      expect(sorted[2]?.current_player_count).toBe(1);
    });

    test('should sort by player count ascending', () => {
      const sorted = sortSessions(mockSessions, {
        sortBy: 'current_player_count',
        order: 'asc',
      });
      expect(sorted[0]?.current_player_count).toBe(1);
      expect(sorted[1]?.current_player_count).toBe(2);
      expect(sorted[2]?.current_player_count).toBe(6);
    });

    test('should sort by creation date (newest first)', () => {
      const sorted = sortSessions(mockSessions, {
        sortBy: 'created_at',
        order: 'desc',
      });
      expect(sorted[0]?.board_title).toBe('Speed Challenge'); // Most recent
      expect(sorted[2]?.board_title).toBe('Casual Fun'); // Oldest
    });

    test('should sort alphabetically by board title', () => {
      const sorted = sortSessions(mockSessions, {
        sortBy: 'board_title',
        order: 'asc',
      });
      expect(sorted[0]?.board_title).toBe('Casual Fun');
      expect(sorted[1]?.board_title).toBe('Classic Bingo');
      expect(sorted[2]?.board_title).toBe('Speed Challenge');
    });
  });

  describe('Combined Filter and Sort', () => {
    test('should filter and sort sessions', () => {
      const result = filterAndSortSessions(
        mockSessions,
        { status: 'waiting' },
        { sortBy: 'current_player_count', order: 'desc' }
      );

      expect(result).toHaveLength(2);
      expect(result[0]?.current_player_count).toBe(2);
      expect(result[1]?.current_player_count).toBe(1);
    });

    test('should handle empty filter results', () => {
      const result = filterAndSortSessions(
        mockSessions,
        { gameCategory: 'CS:GO' }, // Non-existent game
        { sortBy: 'board_title' }
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('Performance', () => {
    test('should handle large session lists efficiently', () => {
      // Generate 1000 mock sessions
      const largeSessions = Array.from({ length: 1000 }, (_, i) => ({
        ...mockSessions[0]!,
        id: `session-${i}`,
        board_title: `Session ${i}`,
        current_player_count: Math.floor(Math.random() * 8) + 1,
        board_game_type: (
          ['Minecraft', 'Valorant', 'Among Us'] as GameCategory[]
        )[i % 3],
      }));

      const startTime = performance.now();

      const filtered = filterSessions(largeSessions, {
        gameCategory: 'Minecraft',
      });
      const sorted = sortSessions(filtered, { sortBy: 'current_player_count' });

      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
      expect(sorted.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle sessions with null values', () => {
      const sessionWithNulls: SessionWithStats = {
        ...mockSessions[0]!,
        board_title: null,
        host_username: null,
        current_player_count: null,
        board_difficulty: null,
      };

      const filtered = filterSessions([sessionWithNulls], { search: 'test' });
      expect(filtered).toHaveLength(0);
    });

    test('should handle empty session list', () => {
      const filtered = filterSessions([], { gameCategory: 'Minecraft' });
      expect(filtered).toHaveLength(0);
    });

    test('should handle undefined filter values', () => {
      const filtered = filterSessions(mockSessions, {
        gameCategory: undefined,
        difficulty: undefined,
        search: undefined,
      });
      expect(filtered).toHaveLength(3);
    });
  });
});
