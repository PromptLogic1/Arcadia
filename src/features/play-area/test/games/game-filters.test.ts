import { describe, test, expect, beforeEach } from 'vitest';
import type { Tables } from '@/types/database.types';

// Types for game filtering
interface GameFilter {
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  search?: string;
  tags?: string[];
  playerCount?: 'all' | 'popular' | 'rising';
  duration?: 'quick' | 'medium' | 'long';
  rating?: number;
  dateRange?: 'recent' | 'week' | 'month' | 'all';
}

interface GameSortOptions {
  sortBy: 'popularity' | 'rating' | 'newest' | 'alphabetical';
  order?: 'asc' | 'desc';
}

// Mock game data type
type Game = {
  id: string;
  title: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  player_count: number;
  average_duration: number;
  rating: number;
  tags: string[];
  created_at: string;
  thumbnail: string;
};

// Game filtering logic extracted from E2E tests
export const filterGames = (games: Game[], filters: GameFilter): Game[] => {
  let filtered = [...games];

  // Category filter
  if (filters.category) {
    filtered = filtered.filter(game => game.category === filters.category);
  }

  // Difficulty filter
  if (filters.difficulty) {
    filtered = filtered.filter(game => game.difficulty === filters.difficulty);
  }

  // Search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(game => 
      game.title.toLowerCase().includes(searchLower) ||
      game.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }

  // Tags filter
  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter(game =>
      filters.tags!.some(tag => game.tags.includes(tag))
    );
  }

  // Player count filter
  if (filters.playerCount) {
    switch (filters.playerCount) {
      case 'popular':
        filtered = filtered.filter(game => game.player_count > 500);
        break;
      case 'rising':
        filtered = filtered.filter(game => game.player_count >= 100 && game.player_count <= 500);
        break;
    }
  }

  // Duration filter
  if (filters.duration) {
    switch (filters.duration) {
      case 'quick':
        filtered = filtered.filter(game => game.average_duration < 30);
        break;
      case 'medium':
        filtered = filtered.filter(game => game.average_duration >= 30 && game.average_duration <= 60);
        break;
      case 'long':
        filtered = filtered.filter(game => game.average_duration > 60);
        break;
    }
  }

  // Rating filter
  if (filters.rating) {
    filtered = filtered.filter(game => game.rating >= filters.rating);
  }

  // Date range filter
  if (filters.dateRange && filters.dateRange !== 'all') {
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (filters.dateRange) {
      case 'recent':
        cutoffDate.setDate(now.getDate() - 2);
        break;
      case 'week':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
    }
    
    filtered = filtered.filter(game => 
      new Date(game.created_at) >= cutoffDate
    );
  }

  return filtered;
};

// Game sorting logic
export const sortGames = (games: Game[], options: GameSortOptions): Game[] => {
  const sorted = [...games];
  const { sortBy, order = 'desc' } = options;

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'popularity':
        comparison = a.player_count - b.player_count;
        break;
      case 'rating':
        comparison = a.rating - b.rating;
        break;
      case 'newest':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case 'alphabetical':
        comparison = a.title.localeCompare(b.title);
        break;
    }

    return order === 'desc' ? -comparison : comparison;
  });

  return sorted;
};

// Combined filter and sort
export const filterAndSortGames = (
  games: Game[],
  filters: GameFilter,
  sortOptions: GameSortOptions
): Game[] => {
  const filtered = filterGames(games, filters);
  return sortGames(filtered, sortOptions);
};

describe('Game Filtering Logic', () => {
  let mockGames: Game[];

  beforeEach(() => {
    mockGames = [
      {
        id: 'game-1',
        title: 'Classic Bingo',
        category: 'puzzle',
        difficulty: 'easy',
        player_count: 1250,
        average_duration: 15,
        rating: 4.5,
        tags: ['classic', 'family-friendly', 'quick'],
        created_at: new Date(Date.now() - 86400000).toISOString(),
        thumbnail: '/images/classic-bingo.jpg'
      },
      {
        id: 'game-2',
        title: 'Speed Chess Bingo',
        category: 'strategy',
        difficulty: 'hard',
        player_count: 890,
        average_duration: 25,
        rating: 4.8,
        tags: ['chess', 'strategy', 'competitive'],
        created_at: new Date(Date.now() - 172800000).toISOString(),
        thumbnail: '/images/chess-bingo.jpg'
      },
      {
        id: 'game-3',
        title: 'Action Movie Bingo',
        category: 'entertainment',
        difficulty: 'medium',
        player_count: 567,
        average_duration: 120,
        rating: 4.2,
        tags: ['movies', 'entertainment', 'long-form'],
        created_at: new Date(Date.now() - 259200000).toISOString(),
        thumbnail: '/images/movie-bingo.jpg'
      },
      {
        id: 'game-4',
        title: 'Math Challenge',
        category: 'educational',
        difficulty: 'hard',
        player_count: 234,
        average_duration: 30,
        rating: 4.0,
        tags: ['math', 'educational', 'challenge'],
        created_at: new Date(Date.now() - 345600000).toISOString(),
        thumbnail: '/images/math-bingo.jpg'
      }
    ];
  });

  describe('Category Filtering', () => {
    test('should filter by single category', () => {
      const filtered = filterGames(mockGames, { category: 'strategy' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.title).toBe('Speed Chess Bingo');
    });

    test('should return empty array for non-existent category', () => {
      const filtered = filterGames(mockGames, { category: 'sports' });
      expect(filtered).toHaveLength(0);
    });

    test('should return all games when no category filter', () => {
      const filtered = filterGames(mockGames, {});
      expect(filtered).toHaveLength(mockGames.length);
    });
  });

  describe('Difficulty Filtering', () => {
    test('should filter by difficulty level', () => {
      const filtered = filterGames(mockGames, { difficulty: 'hard' });
      expect(filtered).toHaveLength(2);
      expect(filtered.every(g => g.difficulty === 'hard')).toBe(true);
    });

    test.each([
      ['easy', 1],
      ['medium', 1],
      ['hard', 2]
    ])('should filter by %s difficulty and return %i games', (difficulty, expectedCount) => {
      const filtered = filterGames(mockGames, { difficulty: difficulty as 'easy' | 'medium' | 'hard' });
      expect(filtered).toHaveLength(expectedCount);
    });
  });

  describe('Search Filtering', () => {
    test('should filter by search term in title', () => {
      const filtered = filterGames(mockGames, { search: 'Chess' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.title).toContain('Chess');
    });

    test('should be case-insensitive', () => {
      const filtered = filterGames(mockGames, { search: 'CHESS' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.title).toContain('Chess');
    });

    test('should search in tags as well', () => {
      const filtered = filterGames(mockGames, { search: 'competitive' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.tags).toContain('competitive');
    });

    test('should return multiple matches', () => {
      const filtered = filterGames(mockGames, { search: 'Bingo' });
      expect(filtered).toHaveLength(3);
    });
  });

  describe('Player Count Filtering', () => {
    test('should filter popular games (>500 players)', () => {
      const filtered = filterGames(mockGames, { playerCount: 'popular' });
      expect(filtered).toHaveLength(3);
      expect(filtered.every(g => g.player_count > 500)).toBe(true);
    });

    test('should filter rising games (100-500 players)', () => {
      const filtered = filterGames(mockGames, { playerCount: 'rising' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.player_count).toBe(234);
    });
  });

  describe('Duration Filtering', () => {
    test('should filter quick games (<30 minutes)', () => {
      const filtered = filterGames(mockGames, { duration: 'quick' });
      expect(filtered).toHaveLength(2);
      expect(filtered.every(g => g.average_duration < 30)).toBe(true);
    });

    test('should filter medium duration games (30-60 minutes)', () => {
      const filtered = filterGames(mockGames, { duration: 'medium' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.average_duration).toBe(30);
    });

    test('should filter long games (>60 minutes)', () => {
      const filtered = filterGames(mockGames, { duration: 'long' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.average_duration).toBe(120);
    });
  });

  describe('Rating Filtering', () => {
    test('should filter by minimum rating', () => {
      const filtered = filterGames(mockGames, { rating: 4.5 });
      expect(filtered).toHaveLength(2);
      expect(filtered.every(g => g.rating >= 4.5)).toBe(true);
    });

    test('should include games with exact rating match', () => {
      const filtered = filterGames(mockGames, { rating: 4.0 });
      expect(filtered).toHaveLength(4);
    });
  });

  describe('Date Range Filtering', () => {
    test('should filter recent games (last 2 days)', () => {
      const filtered = filterGames(mockGames, { dateRange: 'recent' });
      expect(filtered).toHaveLength(2);
    });

    test('should filter games from last week', () => {
      const filtered = filterGames(mockGames, { dateRange: 'week' });
      expect(filtered).toHaveLength(4);
    });

    test('should return all games when dateRange is "all"', () => {
      const filtered = filterGames(mockGames, { dateRange: 'all' });
      expect(filtered).toHaveLength(mockGames.length);
    });
  });

  describe('Tag Filtering', () => {
    test('should filter by single tag', () => {
      const filtered = filterGames(mockGames, { tags: ['competitive'] });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.title).toBe('Speed Chess Bingo');
    });

    test('should filter by multiple tags (OR operation)', () => {
      const filtered = filterGames(mockGames, { tags: ['chess', 'math'] });
      expect(filtered).toHaveLength(2);
    });
  });

  describe('Combined Filtering', () => {
    test('should apply multiple filters simultaneously', () => {
      const filtered = filterGames(mockGames, {
        category: 'puzzle',
        difficulty: 'easy',
        search: 'Classic'
      });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.title).toBe('Classic Bingo');
    });

    test('should return empty when no games match all criteria', () => {
      const filtered = filterGames(mockGames, {
        category: 'puzzle',
        difficulty: 'hard'
      });
      expect(filtered).toHaveLength(0);
    });
  });
});

describe('Game Sorting Logic', () => {
  let mockGames: Game[];

  beforeEach(() => {
    mockGames = [
      {
        id: 'game-1',
        title: 'Classic Bingo',
        category: 'puzzle',
        difficulty: 'easy',
        player_count: 1250,
        average_duration: 15,
        rating: 4.5,
        tags: ['classic'],
        created_at: new Date(Date.now() - 86400000).toISOString(),
        thumbnail: '/images/classic-bingo.jpg'
      },
      {
        id: 'game-2',
        title: 'Speed Chess Bingo',
        category: 'strategy',
        difficulty: 'hard',
        player_count: 890,
        average_duration: 25,
        rating: 4.8,
        tags: ['chess'],
        created_at: new Date(Date.now() - 172800000).toISOString(),
        thumbnail: '/images/chess-bingo.jpg'
      },
      {
        id: 'game-3',
        title: 'Action Movie Bingo',
        category: 'entertainment',
        difficulty: 'medium',
        player_count: 567,
        average_duration: 120,
        rating: 4.2,
        tags: ['movies'],
        created_at: new Date(Date.now() - 259200000).toISOString(),
        thumbnail: '/images/movie-bingo.jpg'
      },
      {
        id: 'game-4',
        title: 'Math Challenge',
        category: 'educational',
        difficulty: 'hard',
        player_count: 234,
        average_duration: 30,
        rating: 4.0,
        tags: ['math'],
        created_at: new Date(Date.now() - 345600000).toISOString(),
        thumbnail: '/images/math-bingo.jpg'
      }
    ];
  });

  describe('Popularity Sorting', () => {
    test('should sort by player count descending', () => {
      const sorted = sortGames(mockGames, { sortBy: 'popularity', order: 'desc' });
      expect(sorted[0]?.title).toBe('Classic Bingo');
      expect(sorted[1]?.title).toBe('Speed Chess Bingo');
      expect(sorted[2]?.title).toBe('Action Movie Bingo');
      expect(sorted[3]?.title).toBe('Math Challenge');
    });

    test('should sort by player count ascending', () => {
      const sorted = sortGames(mockGames, { sortBy: 'popularity', order: 'asc' });
      expect(sorted[0]?.title).toBe('Math Challenge');
      expect(sorted[3]?.title).toBe('Classic Bingo');
    });
  });

  describe('Rating Sorting', () => {
    test('should sort by rating descending', () => {
      const sorted = sortGames(mockGames, { sortBy: 'rating', order: 'desc' });
      expect(sorted[0]?.rating).toBe(4.8);
      expect(sorted[1]?.rating).toBe(4.5);
      expect(sorted[2]?.rating).toBe(4.2);
      expect(sorted[3]?.rating).toBe(4.0);
    });
  });

  describe('Date Sorting', () => {
    test('should sort by newest first', () => {
      const sorted = sortGames(mockGames, { sortBy: 'newest', order: 'desc' });
      expect(sorted[0]?.title).toBe('Classic Bingo');
      expect(sorted[3]?.title).toBe('Math Challenge');
    });
  });

  describe('Alphabetical Sorting', () => {
    test('should sort alphabetically ascending', () => {
      const sorted = sortGames(mockGames, { sortBy: 'alphabetical', order: 'asc' });
      expect(sorted[0]?.title).toBe('Action Movie Bingo');
      expect(sorted[1]?.title).toBe('Classic Bingo');
      expect(sorted[2]?.title).toBe('Math Challenge');
      expect(sorted[3]?.title).toBe('Speed Chess Bingo');
    });
  });
});

describe('Performance Tests', () => {
  test('should handle large datasets efficiently', () => {
    // Generate 1000 games
    const largeDataset: Game[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `game-${i}`,
      title: `Game ${i}`,
      category: ['puzzle', 'strategy', 'entertainment', 'educational'][i % 4] ?? 'puzzle',
      difficulty: (['easy', 'medium', 'hard'][i % 3] ?? 'medium') as 'easy' | 'medium' | 'hard',
      player_count: Math.floor(Math.random() * 2000),
      average_duration: Math.floor(Math.random() * 180),
      rating: 3 + Math.random() * 2,
      tags: [`tag-${i % 10}`, `tag-${i % 20}`],
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
      thumbnail: `/images/game-${i}.jpg`
    }));

    const startTime = performance.now();
    
    // Apply complex filtering
    const filtered = filterAndSortGames(
      largeDataset,
      {
        category: 'puzzle',
        difficulty: 'hard',
        playerCount: 'popular',
        rating: 4.0
      },
      { sortBy: 'rating', order: 'desc' }
    );
    
    const endTime = performance.now();
    const executionTime = endTime - startTime;

    // Should process in under 50ms
    expect(executionTime).toBeLessThan(50);
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.length).toBeLessThan(largeDataset.length);
  });

  test('should handle empty datasets gracefully', () => {
    const emptyDataset: Game[] = [];
    
    const filtered = filterAndSortGames(
      emptyDataset,
      { category: 'puzzle' },
      { sortBy: 'popularity' }
    );
    
    expect(filtered).toHaveLength(0);
    expect(filtered).toEqual([]);
  });
});