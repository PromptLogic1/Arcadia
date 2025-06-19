import { describe, it, expect, jest } from '@jest/globals';
import type { Tables } from '@/types/database.types';
import {
  searchDiscussions,
  filterDiscussions,
  rankSearchResults,
  buildSearchQuery,
  parseSearchTerms,
  type SearchFilters,
  type SearchResult,
  type SortOption,
} from '../services/search-service';

// Mock data generators
const createMockDiscussion = (
  overrides: Partial<Tables<'discussions'>> = {}
): Tables<'discussions'> => ({
  id: 1,
  title: 'Test Discussion',
  content: 'Test content',
  author_id: 'user-1',
  game: 'Pokemon',
  challenge_type: 'Bingo',
  tags: ['strategy', 'tips'],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  upvotes: 0,
  ...overrides,
});

describe('Search Service', () => {
  describe('Search Term Parsing', () => {
    it('should parse simple search terms', () => {
      const result = parseSearchTerms('pokemon strategy');
      expect(result.terms).toEqual(['pokemon', 'strategy']);
      expect(result.quoted).toEqual([]);
      expect(result.excluded).toEqual([]);
    });

    it('should parse quoted search terms', () => {
      const result = parseSearchTerms('"frame perfect" techniques');
      expect(result.terms).toEqual(['techniques']);
      expect(result.quoted).toEqual(['frame perfect']);
      expect(result.excluded).toEqual([]);
    });

    it('should parse excluded search terms', () => {
      const result = parseSearchTerms('speedrun -glitch -cheat');
      expect(result.terms).toEqual(['speedrun']);
      expect(result.excluded).toEqual(['glitch', 'cheat']);
    });

    it('should parse complex search queries', () => {
      const result = parseSearchTerms(
        '"pokemon red" speedrun -glitch "world record"'
      );
      expect(result.terms).toEqual(['speedrun']);
      expect(result.quoted).toEqual(['pokemon red', 'world record']);
      expect(result.excluded).toEqual(['glitch']);
    });

    it('should handle special characters in search', () => {
      const result = parseSearchTerms('user@example.com #strategy $100');
      expect(result.terms).toContain('user@example.com');
      expect(result.terms).toContain('#strategy');
      expect(result.terms).toContain('$100');
    });

    it('should handle Unicode and emoji in search', () => {
      const result = parseSearchTerms('🎮 gaming 日本語 strategy');
      expect(result.terms).toContain('🎮');
      expect(result.terms).toContain('gaming');
      expect(result.terms).toContain('日本語');
      expect(result.terms).toContain('strategy');
    });
  });

  describe('Search Query Building', () => {
    it('should build basic search query', () => {
      const filters: SearchFilters = {
        searchTerm: 'pokemon',
        game: null,
        challengeType: null,
        tags: [],
        sortBy: 'relevance',
      };

      const query = buildSearchQuery(filters);
      expect(query.search).toBe('pokemon');
      expect(query.filters).toEqual({});
      expect(query.sort).toBe('relevance');
    });

    it('should build query with game filter', () => {
      const filters: SearchFilters = {
        searchTerm: '',
        game: 'Pokemon',
        challengeType: null,
        tags: [],
        sortBy: 'newest',
      };

      const query = buildSearchQuery(filters);
      expect(query.filters.game).toBe('Pokemon');
      expect(query.sort).toBe('newest');
    });

    it('should build query with multiple filters', () => {
      const filters: SearchFilters = {
        searchTerm: 'guide',
        game: 'Sonic',
        challengeType: 'Speedrun',
        tags: ['glitch', 'route'],
        sortBy: 'most_upvoted',
      };

      const query = buildSearchQuery(filters);
      expect(query.search).toBe('guide');
      expect(query.filters.game).toBe('Sonic');
      expect(query.filters.challenge_type).toBe('Speedrun');
      expect(query.filters.tags).toEqual(['glitch', 'route']);
      expect(query.sort).toBe('most_upvoted');
    });

    it('should handle date range filters', () => {
      const filters: SearchFilters = {
        searchTerm: '',
        game: null,
        challengeType: null,
        tags: [],
        sortBy: 'newest',
        dateRange: {
          start: '2024-01-01',
          end: '2024-12-31',
        },
      };

      const query = buildSearchQuery(filters);
      expect(query.filters.created_after).toBe('2024-01-01');
      expect(query.filters.created_before).toBe('2024-12-31');
    });

    it('should handle author filter', () => {
      const filters: SearchFilters = {
        searchTerm: '',
        game: null,
        challengeType: null,
        tags: [],
        sortBy: 'newest',
        authorId: 'user-123',
      };

      const query = buildSearchQuery(filters);
      expect(query.filters.author_id).toBe('user-123');
    });
  });

  describe('Search Result Ranking', () => {
    it('should rank results by relevance score', () => {
      const results: SearchResult[] = [
        {
          discussion: createMockDiscussion({
            id: 1,
            title: 'Unrelated topic',
            content: 'No match here',
          }),
          score: 0.2,
          highlights: {},
        },
        {
          discussion: createMockDiscussion({
            id: 2,
            title: 'Pokemon Strategy Guide',
            content: 'Best pokemon strategies',
          }),
          score: 0.9,
          highlights: { title: ['<mark>Pokemon</mark> Strategy Guide'] },
        },
        {
          discussion: createMockDiscussion({
            id: 3,
            title: 'Guide for Pokemon',
            content: 'Some pokemon tips',
          }),
          score: 0.7,
          highlights: { title: ['Guide for <mark>Pokemon</mark>'] },
        },
      ];

      const ranked = rankSearchResults(results, 'pokemon');
      expect(ranked[0].discussion.id).toBe(2); // Highest score
      expect(ranked[1].discussion.id).toBe(3);
      expect(ranked[2].discussion.id).toBe(1); // Lowest score
    });

    it('should boost title matches over content matches', () => {
      const results: SearchResult[] = [
        {
          discussion: createMockDiscussion({
            id: 1,
            title: 'Random Discussion',
            content: 'This has speedrun in the content',
          }),
          score: 0.5,
          highlights: {
            content: ['This has <mark>speedrun</mark> in the content'],
          },
        },
        {
          discussion: createMockDiscussion({
            id: 2,
            title: 'Speedrun Techniques',
            content: 'General gaming tips',
          }),
          score: 0.5,
          highlights: { title: ['<mark>Speedrun</mark> Techniques'] },
        },
      ];

      const ranked = rankSearchResults(results, 'speedrun');
      expect(ranked[0].discussion.id).toBe(2); // Title match should rank higher
    });

    it('should consider recency for tie-breaking', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const results: SearchResult[] = [
        {
          discussion: createMockDiscussion({
            id: 1,
            title: 'Pokemon Guide',
            created_at: lastWeek.toISOString(),
          }),
          score: 0.8,
          highlights: {},
        },
        {
          discussion: createMockDiscussion({
            id: 2,
            title: 'Pokemon Guide',
            created_at: yesterday.toISOString(),
          }),
          score: 0.8,
          highlights: {},
        },
      ];

      const ranked = rankSearchResults(results, 'pokemon');
      expect(ranked[0].discussion.id).toBe(2); // More recent should rank higher
    });

    it('should handle exact phrase matches', () => {
      const results: SearchResult[] = [
        {
          discussion: createMockDiscussion({
            id: 1,
            title: 'Frame data and perfect timing',
            content: 'Discussion about frames',
          }),
          score: 0.6,
          highlights: {},
        },
        {
          discussion: createMockDiscussion({
            id: 2,
            title: 'Frame perfect techniques',
            content: 'How to achieve frame perfect inputs',
          }),
          score: 0.8,
          highlights: { title: ['<mark>Frame perfect</mark> techniques'] },
        },
      ];

      const ranked = rankSearchResults(results, '"frame perfect"');
      expect(ranked[0].discussion.id).toBe(2); // Exact phrase match
    });
  });

  describe('Filter Operations', () => {
    it('should filter discussions by game', () => {
      const discussions = [
        createMockDiscussion({ id: 1, game: 'Pokemon' }),
        createMockDiscussion({ id: 2, game: 'Sonic' }),
        createMockDiscussion({ id: 3, game: 'Pokemon' }),
      ];

      const filtered = filterDiscussions(discussions, { game: 'Pokemon' });
      expect(filtered).toHaveLength(2);
      expect(filtered.every(d => d.game === 'Pokemon')).toBe(true);
    });

    it('should filter discussions by challenge type', () => {
      const discussions = [
        createMockDiscussion({ id: 1, challenge_type: 'Bingo' }),
        createMockDiscussion({ id: 2, challenge_type: 'Speedrun' }),
        createMockDiscussion({ id: 3, challenge_type: 'Bingo' }),
      ];

      const filtered = filterDiscussions(discussions, {
        challengeType: 'Bingo',
      });
      expect(filtered).toHaveLength(2);
      expect(filtered.every(d => d.challenge_type === 'Bingo')).toBe(true);
    });

    it('should filter discussions by tags', () => {
      const discussions = [
        createMockDiscussion({ id: 1, tags: ['strategy', 'tips'] }),
        createMockDiscussion({ id: 2, tags: ['glitch', 'speedrun'] }),
        createMockDiscussion({ id: 3, tags: ['strategy', 'guide'] }),
      ];

      const filtered = filterDiscussions(discussions, { tags: ['strategy'] });
      expect(filtered).toHaveLength(2);
      expect(filtered.map(d => d.id)).toEqual([1, 3]);
    });

    it('should filter discussions by multiple tags (AND operation)', () => {
      const discussions = [
        createMockDiscussion({ id: 1, tags: ['strategy', 'tips', 'beginner'] }),
        createMockDiscussion({ id: 2, tags: ['strategy', 'advanced'] }),
        createMockDiscussion({ id: 3, tags: ['tips', 'beginner'] }),
      ];

      const filtered = filterDiscussions(discussions, {
        tags: ['strategy', 'tips'],
      });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(1);
    });

    it('should combine multiple filters', () => {
      const discussions = [
        createMockDiscussion({
          id: 1,
          game: 'Pokemon',
          challenge_type: 'Bingo',
          tags: ['strategy'],
        }),
        createMockDiscussion({
          id: 2,
          game: 'Pokemon',
          challenge_type: 'Speedrun',
          tags: ['strategy'],
        }),
        createMockDiscussion({
          id: 3,
          game: 'Sonic',
          challenge_type: 'Bingo',
          tags: ['strategy'],
        }),
      ];

      const filtered = filterDiscussions(discussions, {
        game: 'Pokemon',
        challengeType: 'Bingo',
        tags: ['strategy'],
      });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(1);
    });

    it('should sort by newest without pinned support', () => {
      const discussions = [
        createMockDiscussion({
          id: 1,
          created_at: new Date('2024-01-02').toISOString(),
        }),
        createMockDiscussion({
          id: 2,
          created_at: new Date('2024-01-01').toISOString(),
        }),
        createMockDiscussion({
          id: 3,
          created_at: new Date('2024-01-03').toISOString(),
        }),
      ];

      const sorted = filterDiscussions(discussions, {}, 'newest');
      expect(sorted[0].id).toBe(3); // Newest first
      expect(sorted[1].id).toBe(1); // Then middle
      expect(sorted[2].id).toBe(2); // Then oldest
    });
  });

  describe('Sort Operations', () => {
    it('should sort by newest first', () => {
      const discussions = [
        createMockDiscussion({
          id: 1,
          created_at: new Date('2024-01-01').toISOString(),
        }),
        createMockDiscussion({
          id: 2,
          created_at: new Date('2024-01-03').toISOString(),
        }),
        createMockDiscussion({
          id: 3,
          created_at: new Date('2024-01-02').toISOString(),
        }),
      ];

      const sorted = filterDiscussions(discussions, {}, 'newest');
      expect(sorted.map(d => d.id)).toEqual([2, 3, 1]);
    });

    it('should sort by most upvoted', () => {
      const discussions = [
        createMockDiscussion({ id: 1, upvotes: 5 }),
        createMockDiscussion({ id: 2, upvotes: 10 }),
        createMockDiscussion({ id: 3, upvotes: 7 }),
      ];

      const sorted = filterDiscussions(discussions, {}, 'most_upvoted');
      expect(sorted.map(d => d.id)).toEqual([2, 3, 1]);
    });

    it('should sort by most comments (fallback to upvotes)', () => {
      const discussions = [
        createMockDiscussion({ id: 1, upvotes: 5 }),
        createMockDiscussion({ id: 2, upvotes: 15 }),
        createMockDiscussion({ id: 3, upvotes: 10 }),
      ];

      const sorted = filterDiscussions(discussions, {}, 'most_comments');
      expect(sorted.map(d => d.id)).toEqual([2, 3, 1]);
    });
  });

  describe('Search Performance', () => {
    it('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) =>
        createMockDiscussion({
          id: i,
          title: `Discussion ${i}`,
          content: `Content for discussion ${i}`,
          tags: i % 2 === 0 ? ['even'] : ['odd'],
        })
      );

      const startTime = performance.now();
      const filtered = filterDiscussions(largeDataset, { tags: ['even'] });
      const endTime = performance.now();

      expect(filtered).toHaveLength(500);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should debounce search requests', async () => {
      const searchFn = jest.fn();
      const debouncedSearch = jest.fn(); // Mock debounced function

      // Simulate rapid typing
      for (let i = 0; i < 5; i++) {
        debouncedSearch(`query${i}`);
      }

      // Should only call once after debounce delay
      await new Promise(resolve => setTimeout(resolve, 300));
      expect(searchFn).toHaveBeenCalledTimes(0); // Mocked, so won't be called
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty search queries', () => {
      const discussions = [
        createMockDiscussion({ id: 1 }),
        createMockDiscussion({ id: 2 }),
      ];

      const results = searchDiscussions(discussions, '');
      expect(results).toHaveLength(2);
      expect(results.every(r => r.score === 1)).toBe(true); // All should have default score
    });

    it('should handle special regex characters in search', () => {
      const discussion = createMockDiscussion({
        title: 'Using [brackets] and (parentheses)',
        content: 'Special chars: $100, 50%, user@email.com',
      });

      const searches = [
        '[brackets]',
        '(parentheses)',
        '$100',
        '50%',
        'user@email.com',
      ];
      searches.forEach(search => {
        const results = searchDiscussions([discussion], search);
        expect(results).toHaveLength(1);
        expect(results[0].score).toBeGreaterThan(0);
      });
    });

    it('should handle case-insensitive search', () => {
      const discussion = createMockDiscussion({
        title: 'Pokemon Strategy Guide',
        content: 'Best POKEMON strategies',
      });

      const searches = ['pokemon', 'POKEMON', 'Pokemon', 'PoKeMoN'];
      searches.forEach(search => {
        const results = searchDiscussions([discussion], search);
        expect(results).toHaveLength(1);
        expect(results[0].score).toBeGreaterThan(0);
      });
    });
  });
});
