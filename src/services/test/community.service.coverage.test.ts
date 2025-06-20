/**
 * @jest-environment node
 *
 * Community Service Coverage Tests
 * Target coverage gaps in lines: 71-84, 127-138, 175-186, 249-260, 296-307
 */

import { communityService } from '../community.service';
import { createClient } from '@/lib/supabase';
import type { DiscussionAPIFilters } from '../community.service';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/logger');

const mockSupabase = {
  from: jest.fn(),
  rpc: jest.fn(),
};

const mockFrom = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  eq: jest.fn(),
  or: jest.fn(),
  order: jest.fn(),
  range: jest.fn(),
  single: jest.fn(),
};

describe('communityService - Coverage Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    mockSupabase.from.mockReturnValue(mockFrom);

    // Setup default chaining behavior
    mockFrom.select.mockReturnValue(mockFrom);
    mockFrom.insert.mockReturnValue(mockFrom);
    mockFrom.update.mockReturnValue(mockFrom);
    mockFrom.eq.mockReturnValue(mockFrom);
    mockFrom.or.mockReturnValue(mockFrom);
    mockFrom.order.mockReturnValue(mockFrom);
    mockFrom.range.mockReturnValue(mockFrom);
    mockFrom.single.mockReturnValue(mockFrom);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDiscussionsForAPI - Sorting (lines 175-178)', () => {
    it('should apply most_commented sorting correctly', async () => {
      const filters: DiscussionAPIFilters = {
        sort: 'most_commented',
      };

      const mockDiscussions = [
        {
          id: 1,
          title: 'Popular Discussion',
          content: 'Content',
          author: { username: 'user1', avatar_url: null },
          comment_count: 50,
        },
      ];

      mockFrom.range.mockResolvedValueOnce({
        data: mockDiscussions,
        error: null,
        count: 1,
      });

      const result = await communityService.getDiscussionsForAPI(filters);

      expect(result.success).toBe(true);
      expect(mockFrom.order).toHaveBeenCalledWith('comment_count', {
        ascending: false,
      });
    });

    it('should apply recent sorting by default', async () => {
      // No sort specified, should default to recent
      const filters: DiscussionAPIFilters = {};

      mockFrom.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0,
      });

      await communityService.getDiscussionsForAPI(filters);

      expect(mockFrom.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
    });

    it('should apply recent sorting explicitly', async () => {
      const filters: DiscussionAPIFilters = {
        sort: 'recent',
      };

      mockFrom.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0,
      });

      await communityService.getDiscussionsForAPI(filters);

      expect(mockFrom.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
    });
  });

  describe('getDiscussionsForAPI - Data transformation (lines 195-200)', () => {
    it('should transform discussions with null author correctly', async () => {
      const mockDiscussions = [
        {
          id: 1,
          title: 'Discussion without author',
          content: 'Content',
          author: null, // null author
          author_id: 'deleted-user',
          game: 'Test Game',
          challenge_type: null,
          upvotes: 0,
          tags: [],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: null,
        },
      ];

      mockFrom.range.mockResolvedValueOnce({
        data: mockDiscussions,
        error: null,
        count: 1,
      });

      const result = await communityService.getDiscussionsForAPI();

      expect(result.success).toBe(true);
      expect(result.data?.discussions[0]?.author).toBeUndefined();
    });

    it('should preserve all discussion fields in transformation', async () => {
      const mockDiscussion = {
        id: 1,
        title: 'Full Discussion',
        content: 'Full content',
        author_id: 'user-123',
        game: 'Test Game',
        challenge_type: 'speedrun',
        upvotes: 10,
        tags: ['tag1', 'tag2'],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        author: {
          username: 'testuser',
          avatar_url: 'https://example.com/avatar.jpg',
        },
        comments: [{ count: 5 }],
      };

      mockFrom.range.mockResolvedValueOnce({
        data: [mockDiscussion],
        error: null,
        count: 1,
      });

      const result = await communityService.getDiscussionsForAPI();

      expect(result.success).toBe(true);
      const transformed = result.data?.discussions[0];
      expect(transformed).toMatchObject({
        id: mockDiscussion.id,
        title: mockDiscussion.title,
        content: mockDiscussion.content,
        author_id: mockDiscussion.author_id,
        game: mockDiscussion.game,
        challenge_type: mockDiscussion.challenge_type,
        upvotes: mockDiscussion.upvotes,
        tags: mockDiscussion.tags,
        created_at: mockDiscussion.created_at,
        updated_at: mockDiscussion.updated_at,
        author: mockDiscussion.author,
      });
    });
  });

  describe('getDiscussions - Sorting lines 249-260', () => {
    it('should apply comments sorting correctly', async () => {
      const filters = {
        sortBy: 'comments' as const,
      };

      mockFrom.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0,
      });

      await communityService.getDiscussions(filters);

      expect(mockFrom.order).toHaveBeenCalledWith('comment_count', {
        ascending: false,
      });
    });

    it('should apply default (recent) sorting when sortBy is not specified', async () => {
      const filters = {};

      mockFrom.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0,
      });

      await communityService.getDiscussions(filters);

      expect(mockFrom.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
    });

    it('should apply recent sorting explicitly', async () => {
      const filters = {
        sortBy: 'recent' as const,
      };

      mockFrom.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0,
      });

      await communityService.getDiscussions(filters);

      expect(mockFrom.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
    });
  });

  describe('getDiscussions - Data transformation with users relation (lines 276-284)', () => {
    it('should transform discussion with users relation correctly', async () => {
      const mockDiscussion = {
        id: 1,
        title: 'Discussion with user',
        content: 'Content',
        users: {
          username: 'johndoe',
          avatar_url: 'https://example.com/john.jpg',
        },
      };

      mockFrom.range.mockResolvedValueOnce({
        data: [mockDiscussion],
        error: null,
        count: 1,
      });

      const result = await communityService.getDiscussions();

      expect(result.success).toBe(true);
      expect(result.data?.discussions[0]?.author).toEqual({
        username: 'johndoe',
        avatar_url: 'https://example.com/john.jpg',
      });
    });

    it('should handle discussion without users relation', async () => {
      const mockDiscussion = {
        id: 1,
        title: 'Discussion without user',
        content: 'Content',
        users: null,
      };

      mockFrom.range.mockResolvedValueOnce({
        data: [mockDiscussion],
        error: null,
        count: 1,
      });

      const result = await communityService.getDiscussions();

      expect(result.success).toBe(true);
      expect(result.data?.discussions[0]?.author).toBeUndefined();
    });
  });

  describe('Edge cases and error paths', () => {
    it('should handle empty data array in getDiscussionsForAPI', async () => {
      mockFrom.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0,
      });

      const result = await communityService.getDiscussionsForAPI();

      expect(result.success).toBe(true);
      expect(result.data?.discussions).toEqual([]);
      expect(result.data?.totalCount).toBe(0);
    });

    it('should handle null data in getDiscussionsForAPI', async () => {
      mockFrom.range.mockResolvedValueOnce({
        data: null,
        error: null,
        count: 0,
      });

      const result = await communityService.getDiscussionsForAPI();

      expect(result.success).toBe(true);
      expect(result.data?.discussions).toEqual([]);
      expect(result.data?.totalCount).toBe(0);
    });

    it('should handle pagination edge cases in getDiscussionsForAPI', async () => {
      // Test with large page number
      mockFrom.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 5,
      });

      const result = await communityService.getDiscussionsForAPI({}, 100, 20);

      expect(result.success).toBe(true);
      expect(mockFrom.range).toHaveBeenCalledWith(1980, 1999); // (100-1)*20, start+20-1
    });

    it('should handle all filters simultaneously in getDiscussionsForAPI', async () => {
      const filters: DiscussionAPIFilters = {
        game: 'Tetris',
        challenge_type: 'marathon',
        search: 'high score',
        sort: 'popular',
      };

      mockFrom.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0,
      });

      await communityService.getDiscussionsForAPI(filters);

      expect(mockFrom.eq).toHaveBeenCalledWith('game', 'Tetris');
      expect(mockFrom.eq).toHaveBeenCalledWith('challenge_type', 'marathon');
      expect(mockFrom.or).toHaveBeenCalledWith(
        'title.ilike.%high score%,content.ilike.%high score%'
      );
      expect(mockFrom.order).toHaveBeenCalledWith('upvotes', {
        ascending: false,
      });
    });
  });
});
