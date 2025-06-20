/**
 * @jest-environment node
 */

import { communityService } from '../community.service';
import { createClient } from '@/lib/supabase';
import { log } from '@/lib/logger';
import type {
  CreateDiscussionData,
  CreateCommentData,
  DiscussionFilters,
  DiscussionAPIFilters,
  EventFilters,
} from '../community.service';

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

describe('communityService', () => {
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

  describe('getDiscussionsForAPI', () => {
    it('should fetch discussions for API with default parameters', async () => {
      const mockDiscussions = [
        {
          id: 1,
          title: 'Test Discussion',
          content: 'Test content',
          author_id: 'user-123',
          game: 'All Games',
          challenge_type: null,
          upvotes: 5,
          tags: ['test'],
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          author: {
            username: 'testuser',
            avatar_url: null,
          },
          comments: [{ count: 3 }],
        },
      ];

      mockFrom.range.mockResolvedValueOnce({
        data: mockDiscussions,
        error: null,
        count: 1,
      });

      const result = await communityService.getDiscussionsForAPI();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        discussions: mockDiscussions,
        totalCount: 1,
      });
      expect(mockSupabase.from).toHaveBeenCalledWith('discussions');
      expect(mockFrom.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
    });

    it('should apply game filter', async () => {
      const filters: DiscussionAPIFilters = {
        game: 'Tetris',
      };

      mockFrom.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0,
      });

      await communityService.getDiscussionsForAPI(filters);

      expect(mockFrom.eq).toHaveBeenCalledWith('game', 'Tetris');
    });

    it('should apply challenge type filter', async () => {
      const filters: DiscussionAPIFilters = {
        challenge_type: 'speedrun',
      };

      mockFrom.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0,
      });

      await communityService.getDiscussionsForAPI(filters);

      expect(mockFrom.eq).toHaveBeenCalledWith('challenge_type', 'speedrun');
    });

    it('should apply search filter', async () => {
      const filters: DiscussionAPIFilters = {
        search: 'test query',
      };

      mockFrom.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0,
      });

      await communityService.getDiscussionsForAPI(filters);

      expect(mockFrom.or).toHaveBeenCalledWith(
        'title.ilike.%test query%,content.ilike.%test query%'
      );
    });

    it('should apply popular sorting', async () => {
      const filters: DiscussionAPIFilters = {
        sort: 'popular',
      };

      mockFrom.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0,
      });

      await communityService.getDiscussionsForAPI(filters);

      expect(mockFrom.order).toHaveBeenCalledWith('upvotes', {
        ascending: false,
      });
    });

    it('should apply most commented sorting', async () => {
      const filters: DiscussionAPIFilters = {
        sort: 'most_commented',
      };

      mockFrom.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0,
      });

      await communityService.getDiscussionsForAPI(filters);

      expect(mockFrom.order).toHaveBeenCalledWith('comment_count', {
        ascending: false,
      });
    });

    it('should apply pagination', async () => {
      mockFrom.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0,
      });

      await communityService.getDiscussionsForAPI({}, 3, 10);

      expect(mockFrom.range).toHaveBeenCalledWith(20, 29); // (page-1)*limit, start+limit-1
    });

    it('should handle database errors', async () => {
      mockFrom.range.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
        count: null,
      });

      const result = await communityService.getDiscussionsForAPI();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to fetch discussions for API',
        expect.any(Object),
        expect.objectContaining({
          metadata: { filters: {}, page: 1, limit: 20 },
        })
      );
    });
  });

  describe('getDiscussions', () => {
    it('should fetch discussions with filters', async () => {
      const filters: DiscussionFilters = {
        gameCategory: 'Minecraft',
        challengeType: 'sprint',
        search: 'test',
        sortBy: 'popular',
      };

      mockFrom.range.mockResolvedValueOnce({
        data: [
          {
            id: 1,
            title: 'Test',
            users: {
              username: 'testuser',
              avatar_url: null,
            },
          },
        ],
        error: null,
        count: 1,
      });

      const result = await communityService.getDiscussions(filters);

      expect(result.success).toBe(true);
      expect(mockFrom.eq).toHaveBeenCalledWith('game_category', 'Minecraft');
      expect(mockFrom.eq).toHaveBeenCalledWith('challenge_type', 'sprint');
      expect(mockFrom.or).toHaveBeenCalledWith(
        'title.ilike.%test%,content.ilike.%test%'
      );
      expect(mockFrom.order).toHaveBeenCalledWith('upvotes', {
        ascending: false,
      });
    });

    it('should skip All Games filter', async () => {
      const filters: DiscussionFilters = {
        gameCategory: 'All Games',
      };

      mockFrom.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0,
      });

      await communityService.getDiscussions(filters);

      // Should not add game_category filter for 'All Games'
      expect(mockFrom.eq).not.toHaveBeenCalledWith(
        'game_category',
        'All Games'
      );
    });
  });

  describe('getDiscussionById', () => {
    it('should fetch discussion by ID', async () => {
      const mockDiscussion = {
        id: 1,
        title: 'Test Discussion',
        content: 'Test content',
        users: {
          username: 'testuser',
          avatar_url: null,
        },
      };

      mockFrom.single.mockResolvedValueOnce({
        data: mockDiscussion,
        error: null,
      });

      const result = await communityService.getDiscussionById('1');

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        id: 1,
        title: 'Test Discussion',
        author: {
          username: 'testuser',
          avatar_url: null,
        },
      });
      expect(mockFrom.eq).toHaveBeenCalledWith('id', 1);
    });

    it('should handle discussion not found', async () => {
      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Discussion not found' },
      });

      const result = await communityService.getDiscussionById('999');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Discussion not found');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to fetch discussion by ID',
        expect.any(Object),
        expect.objectContaining({
          metadata: { discussionId: '999' },
        })
      );
    });
  });

  describe('createDiscussion', () => {
    it('should create discussion successfully', async () => {
      const discussionData: CreateDiscussionData = {
        title: 'New Discussion',
        content: 'Discussion content',
        author_id: 'user-123',
        game: 'Tetris',
        challenge_type: 'sprint',
        tags: ['beginner', 'tips'],
      };

      const createdDiscussion = {
        id: 1,
        ...discussionData,
        users: {
          username: 'testuser',
          avatar_url: null,
        },
      };

      mockFrom.single.mockResolvedValueOnce({
        data: createdDiscussion,
        error: null,
      });

      const result = await communityService.createDiscussion(discussionData);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        title: 'New Discussion',
        content: 'Discussion content',
        author: {
          username: 'testuser',
          avatar_url: null,
        },
      });
      expect(mockFrom.insert).toHaveBeenCalledWith({
        title: 'New Discussion',
        content: 'Discussion content',
        author_id: 'user-123',
        game: 'Tetris',
        challenge_type: 'sprint',
        tags: ['beginner', 'tips'],
      });
    });

    it('should handle missing optional fields', async () => {
      const discussionData: CreateDiscussionData = {
        title: 'Simple Discussion',
        content: 'Simple content',
        author_id: 'user-123',
        game: 'All Games',
      };

      const createdDiscussion = {
        id: 1,
        ...discussionData,
        challenge_type: null,
        tags: [],
        users: null,
      };

      mockFrom.single.mockResolvedValueOnce({
        data: createdDiscussion,
        error: null,
      });

      const result = await communityService.createDiscussion(discussionData);

      expect(result.success).toBe(true);
      expect(mockFrom.insert).toHaveBeenCalledWith({
        title: 'Simple Discussion',
        content: 'Simple content',
        author_id: 'user-123',
        game: 'All Games',
        challenge_type: null,
        tags: [],
      });
    });

    it('should handle creation errors', async () => {
      const discussionData: CreateDiscussionData = {
        title: 'Failed Discussion',
        content: 'Content',
        author_id: 'user-123',
        game: 'Test',
      };

      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Creation failed' },
      });

      const result = await communityService.createDiscussion(discussionData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Creation failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to create discussion',
        expect.any(Object),
        expect.objectContaining({
          metadata: { discussionData },
        })
      );
    });
  });

  describe('getDiscussionComments', () => {
    it('should fetch comments for discussion', async () => {
      const mockComments = [
        {
          id: 1,
          content: 'Great discussion!',
          author_id: 'user-456',
          discussion_id: 1,
          upvotes: 2,
          created_at: '2024-01-01T00:00:00Z',
          users: {
            username: 'commenter',
            avatar_url: null,
          },
        },
      ];

      mockFrom.range.mockResolvedValueOnce({
        data: mockComments,
        error: null,
        count: 1,
      });

      const result = await communityService.getDiscussionComments('1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        comments: [
          {
            id: 1,
            content: 'Great discussion!',
            author_id: 'user-456',
            discussion_id: 1,
            upvotes: 2,
            created_at: '2024-01-01T00:00:00Z',
            users: {
              username: 'commenter',
              avatar_url: null,
            },
            author: {
              username: 'commenter',
              avatar_url: null,
            },
          },
        ],
        totalCount: 1,
      });
      expect(mockFrom.eq).toHaveBeenCalledWith('discussion_id', 1);
      expect(mockFrom.order).toHaveBeenCalledWith('created_at', {
        ascending: true,
      });
    });

    it('should apply pagination to comments', async () => {
      mockFrom.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0,
      });

      await communityService.getDiscussionComments('1', 2, 25);

      expect(mockFrom.range).toHaveBeenCalledWith(25, 49); // (2-1)*25, 25+25-1
    });
  });

  describe('createComment', () => {
    it('should create comment successfully', async () => {
      const commentData: CreateCommentData = {
        content: 'This is a great discussion!',
        author_id: 'user-456',
        discussion_id: '1',
      };

      const createdComment = {
        id: 1,
        content: 'This is a great discussion!',
        author_id: 'user-456',
        discussion_id: 1,
        upvotes: 0,
        created_at: expect.any(String),
        users: {
          username: 'commenter',
          avatar_url: null,
        },
      };

      mockFrom.single.mockResolvedValueOnce({
        data: createdComment,
        error: null,
      });

      const result = await communityService.createComment(commentData);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        content: 'This is a great discussion!',
        author: {
          username: 'commenter',
          avatar_url: null,
        },
      });
      expect(mockFrom.insert).toHaveBeenCalledWith({
        content: 'This is a great discussion!',
        author_id: 'user-456',
        discussion_id: 1,
        upvotes: 0,
        created_at: expect.any(String),
      });
    });

    it('should handle comment creation errors', async () => {
      const commentData: CreateCommentData = {
        content: 'Failed comment',
        author_id: 'user-456',
        discussion_id: '1',
      };

      mockFrom.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Comment creation failed' },
      });

      const result = await communityService.createComment(commentData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Comment creation failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to create comment',
        expect.any(Object),
        expect.objectContaining({
          metadata: { commentData },
        })
      );
    });
  });

  describe('upvoteDiscussion', () => {
    it('should upvote discussion successfully', async () => {
      // Mock RPC call
      mockSupabase.rpc.mockResolvedValueOnce({
        error: null,
      });

      // Mock getDiscussionById call
      jest.spyOn(communityService, 'getDiscussionById').mockResolvedValueOnce({
        success: true,
        data: {
          id: 1,
          title: 'Test Discussion',
          upvotes: 6,
          content: '',
          game: '',
          author_id: null,
          challenge_type: null,
          created_at: null,
          tags: null,
          updated_at: null,
        },
        error: null,
      });

      const result = await communityService.upvoteDiscussion('1');

      expect(result.success).toBe(true);
      expect(result.data?.upvotes).toBe(6);
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'increment_discussion_upvotes',
        {
          discussion_id: 1,
        }
      );
    });

    it('should handle RPC errors', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        error: { message: 'RPC failed' },
      });

      const result = await communityService.upvoteDiscussion('1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('RPC failed');
      expect(log.error).toHaveBeenCalledWith(
        'Failed to upvote discussion',
        expect.any(Object),
        expect.objectContaining({
          metadata: { discussionId: '1' },
        })
      );
    });
  });

  describe('getEvents', () => {
    it('should return empty events array (not implemented)', async () => {
      const filters: EventFilters = {
        upcoming: true,
        search: 'test',
        tags: ['community'],
      };

      const result = await communityService.getEvents(filters);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        events: [],
        totalCount: 0,
      });
    });

    it('should handle different filter combinations', async () => {
      const result = await communityService.getEvents(
        { upcoming: false },
        2,
        15
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        events: [],
        totalCount: 0,
      });
    });
  });
});
