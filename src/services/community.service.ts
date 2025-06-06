/**
 * Community Service
 *
 * Pure functions for community features (discussions, events).
 * No state management - only data fetching and mutations.
 */

import { createClient } from '@/lib/supabase';
import type { GameCategory } from '@/types';

export interface Discussion {
  id: number;
  title: string;
  content: string;
  author_id: string | null;
  game: string;
  challenge_type: string | null;
  upvotes: number | null;
  tags: string[] | null;
  created_at: string | null;
  updated_at: string | null;
  // Populated fields
  author?: {
    username: string;
    avatar_url: string | null;
  };
  comment_count?: number;
}

export interface Comment {
  id: number;
  content: string;
  author_id: string | null;
  discussion_id: number | null;
  upvotes: number | null;
  created_at: string | null;
  updated_at: string | null;
  // Populated fields
  author?: {
    username: string;
    avatar_url: string | null;
  };
}

export interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  participant_count: number;
  max_participants: number | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string | null;
}

export interface CreateDiscussionData {
  title: string;
  content: string;
  author_id: string;
  game: string;
  challenge_type?: string | null;
  tags?: string[];
}

export interface CreateCommentData {
  content: string;
  author_id: string;
  discussion_id: string;
}

export interface DiscussionFilters {
  gameCategory?: GameCategory | 'All Games';
  challengeType?: string;
  search?: string;
  sortBy?: 'recent' | 'popular' | 'comments';
}

export interface DiscussionAPIFilters {
  game?: string;
  challenge_type?: string;
  search?: string;
  sort?: 'recent' | 'popular' | 'most_commented';
}

export interface EventFilters {
  upcoming?: boolean;
  search?: string;
  tags?: string[];
}

export const communityService = {
  /**
   * Get discussions for API route with specific filters
   */
  async getDiscussionsForAPI(
    filters: DiscussionAPIFilters = {},
    page = 1,
    limit = 20
  ): Promise<{
    discussions: Discussion[];
    totalCount: number;
    error?: string;
  }> {
    try {
      const supabase = createClient();
      let query = supabase.from('discussions').select(
        `
          *,
          author:users!discussions_author_id_fkey(username, avatar_url),
          comments:comments(count)
        `,
        { count: 'exact' }
      );

      // Apply filters
      if (filters.game) {
        query = query.eq('game', filters.game);
      }

      if (filters.challenge_type) {
        query = query.eq('challenge_type', filters.challenge_type);
      }

      if (filters.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`
        );
      }

      // Apply sorting
      switch (filters.sort) {
        case 'popular':
          query = query.order('upvotes', { ascending: false });
          break;
        case 'most_commented':
          query = query.order('comment_count', { ascending: false });
          break;
        case 'recent':
        default:
          query = query.order('created_at', { ascending: false });
          break;
      }

      // Apply pagination
      const start = (page - 1) * limit;
      const end = start + limit - 1;

      const { data, error, count } = await query.range(start, end);

      if (error) {
        return {
          discussions: [],
          totalCount: 0,
          error: error.message,
        };
      }

      // Transform the data to match Discussion type
      const discussions: Discussion[] = (data || []).map(discussion => ({
        ...discussion,
        // Ensure author is undefined instead of null
        author: discussion.author || undefined,
      }));

      return {
        discussions,
        totalCount: count || 0,
      };
    } catch (error) {
      return {
        discussions: [],
        totalCount: 0,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch discussions',
      };
    }
  },

  /**
   * Get discussions with filtering and pagination
   */
  async getDiscussions(
    filters: DiscussionFilters = {},
    page = 1,
    limit = 20
  ): Promise<{
    discussions: Discussion[];
    totalCount: number;
    error?: string;
  }> {
    try {
      const supabase = createClient();
      let query = supabase.from('discussions').select(
        `
          *,
          users!author_id(username, avatar_url)
        `,
        { count: 'exact' }
      );

      // Apply filters
      if (filters.gameCategory && filters.gameCategory !== 'All Games') {
        query = query.eq('game_category', filters.gameCategory);
      }

      if (filters.challengeType) {
        query = query.eq('challenge_type', filters.challengeType);
      }

      if (filters.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`
        );
      }

      // Apply sorting
      switch (filters.sortBy) {
        case 'popular':
          query = query.order('upvotes', { ascending: false });
          break;
        case 'comments':
          query = query.order('comment_count', { ascending: false });
          break;
        case 'recent':
        default:
          query = query.order('created_at', { ascending: false });
          break;
      }

      // Apply pagination
      const start = (page - 1) * limit;
      const end = start + limit - 1;

      const { data, error, count } = await query.range(start, end);

      if (error) {
        return {
          discussions: [],
          totalCount: 0,
          error: error.message,
        };
      }

      // Transform the data
      const discussions = (data || []).map(discussion => ({
        ...discussion,
        author: discussion.users
          ? {
              username: discussion.users.username,
              avatar_url: discussion.users.avatar_url,
            }
          : undefined,
      }));

      return {
        discussions,
        totalCount: count || 0,
      };
    } catch (error) {
      return {
        discussions: [],
        totalCount: 0,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch discussions',
      };
    }
  },

  /**
   * Get discussion by ID
   */
  async getDiscussionById(
    discussionId: string
  ): Promise<{ discussion: Discussion | null; error?: string }> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('discussions')
        .select(
          `
          *,
          users!author_id(username, avatar_url)
        `
        )
        .eq('id', parseInt(discussionId))
        .single();

      if (error) {
        return { discussion: null, error: error.message };
      }

      const discussion = {
        ...data,
        author: data.users
          ? {
              username: data.users.username,
              avatar_url: data.users.avatar_url,
            }
          : undefined,
      };

      return { discussion };
    } catch (error) {
      return {
        discussion: null,
        error:
          error instanceof Error ? error.message : 'Failed to fetch discussion',
      };
    }
  },

  /**
   * Create a new discussion
   */
  async createDiscussion(
    discussionData: CreateDiscussionData
  ): Promise<{ discussion: Discussion | null; error?: string }> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('discussions')
        .insert({
          title: discussionData.title,
          content: discussionData.content,
          author_id: discussionData.author_id,
          game: discussionData.game,
          challenge_type: discussionData.challenge_type || null,
          tags: discussionData.tags || [],
        })
        .select(
          `
          *,
          users!author_id(username, avatar_url)
        `
        )
        .single();

      if (error) {
        return { discussion: null, error: error.message };
      }

      const discussion = {
        ...data,
        author: data.users
          ? {
              username: data.users.username,
              avatar_url: data.users.avatar_url,
            }
          : undefined,
      };

      return { discussion };
    } catch (error) {
      return {
        discussion: null,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create discussion',
      };
    }
  },

  /**
   * Get comments for a discussion
   */
  async getDiscussionComments(
    discussionId: string,
    page = 1,
    limit = 50
  ): Promise<{ comments: Comment[]; totalCount: number; error?: string }> {
    try {
      const supabase = createClient();
      const start = (page - 1) * limit;
      const end = start + limit - 1;

      const { data, error, count } = await supabase
        .from('comments')
        .select(
          `
          *,
          users!author_id(username, avatar_url)
        `,
          { count: 'exact' }
        )
        .eq('discussion_id', parseInt(discussionId))
        .order('created_at', { ascending: true })
        .range(start, end);

      if (error) {
        return {
          comments: [],
          totalCount: 0,
          error: error.message,
        };
      }

      // Transform the data
      const comments = (data || []).map(comment => ({
        ...comment,
        author: comment.users
          ? {
              username: comment.users.username,
              avatar_url: comment.users.avatar_url,
            }
          : undefined,
      }));

      return {
        comments,
        totalCount: count || 0,
      };
    } catch (error) {
      return {
        comments: [],
        totalCount: 0,
        error:
          error instanceof Error ? error.message : 'Failed to fetch comments',
      };
    }
  },

  /**
   * Create a new comment
   */
  async createComment(
    commentData: CreateCommentData
  ): Promise<{ comment: Comment | null; error?: string }> {
    try {
      const supabase = createClient();

      // Insert comment and increment discussion comment count
      const { data, error } = await supabase
        .from('comments')
        .insert({
          content: commentData.content,
          author_id: commentData.author_id,
          discussion_id: parseInt(commentData.discussion_id),
          upvotes: 0,
          created_at: new Date().toISOString(),
        })
        .select(
          `
          *,
          users!author_id(username, avatar_url)
        `
        )
        .single();

      if (error) {
        return { comment: null, error: error.message };
      }

      // TODO: Update discussion comment count (could be done with a trigger)
      // await supabase.rpc('increment_comment_count', {
      //   discussion_id: parseInt(commentData.discussion_id),
      // });

      const comment = {
        ...data,
        author: data.users
          ? {
              username: data.users.username,
              avatar_url: data.users.avatar_url,
            }
          : undefined,
      };

      return { comment };
    } catch (error) {
      return {
        comment: null,
        error:
          error instanceof Error ? error.message : 'Failed to create comment',
      };
    }
  },

  /**
   * Upvote a discussion
   */
  async upvoteDiscussion(
    discussionId: string
  ): Promise<{ discussion: Discussion | null; error?: string }> {
    try {
      const supabase = createClient();

      // Use RPC function to atomically increment upvotes
      const { error: rpcError } = await supabase.rpc(
        'increment_discussion_upvotes',
        { discussion_id: parseInt(discussionId) }
      );

      if (rpcError) {
        return { discussion: null, error: rpcError.message };
      }

      // Fetch the updated discussion
      return this.getDiscussionById(discussionId);
    } catch (error) {
      return {
        discussion: null,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to upvote discussion',
      };
    }
  },

  /**
   * Get events with filtering
   */
  async getEvents(
    _filters: EventFilters = {},
    _page = 1,
    _limit = 20
  ): Promise<{ events: Event[]; totalCount: number; error?: string }> {
    // TODO: Events table not yet implemented in database
    return { events: [], totalCount: 0 };

    /* Commented out until events table is created
    try {
      const supabase = createClient();
      let query = supabase
        .from('events')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.upcoming) {
        query = query.gte('event_date', new Date().toISOString());
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      // Apply pagination
      const start = (page - 1) * limit;
      const end = start + limit - 1;

      const { data, error, count } = await query
        .order('event_date', { ascending: true })
        .range(start, end);

      if (error) {
        return { 
          events: [], 
          totalCount: 0, 
          error: error.message 
        };
      }

      return {
        events: (data || []) as Event[],
        totalCount: count || 0,
      };
    } catch (error) {
      return { 
        events: [], 
        totalCount: 0,
        error: error instanceof Error ? error.message : 'Failed to fetch events' 
      };
    }
    */
  },
};
