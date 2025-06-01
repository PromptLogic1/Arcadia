'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { logger as _logger } from '@/lib/logger';
import type {
  Discussion as BaseDiscussion,
  Comment as BaseComment,
} from '@/lib/stores/community-store';
import type { Database } from '@/types/database-generated';

// Extended Discussion type that includes UI-specific properties
export interface Discussion extends BaseDiscussion {
  author?: { username: string; avatar_url: string | null };
  comments_count?: number;
  commentList?: Comment[];
}

// Frontend Comment type, extending BaseComment if needed, or just defining fully
export interface Comment extends BaseComment {
  author?: { username: string; avatar_url: string | null };
}

export interface UseDiscussionsReturn {
  discussions: Discussion[];
  error: Error | null;
  isLoading: boolean;
  addDiscussion: (
    discussionData: Omit<
      BaseDiscussion,
      'id' | 'upvotes' | 'created_at' | 'updated_at' | 'author_id'
    >
  ) => Promise<Discussion>;
  addComment: (
    discussionId: number,
    commentData: Omit<
      BaseComment,
      | 'id'
      | 'discussion_id'
      | 'upvotes'
      | 'created_at'
      | 'updated_at'
      | 'author_id'
    >
  ) => Promise<Comment>;
  upvoteDiscussion: (discussionId: number) => Promise<void>;
}

type DatabaseDiscussion = Database['public']['Tables']['discussions']['Row'];
type DatabaseComment = Database['public']['Tables']['comments']['Row'];

interface DiscussionWithRelations extends DatabaseDiscussion {
  author: {
    username: string;
    avatar_url: string | null;
  };
  comments: {
    count: number;
  };
  commentList: Array<
    DatabaseComment & {
      author: {
        username: string;
        avatar_url: string | null;
      };
    }
  >;
}

type PostgrestError = {
  code: string;
  message: string;
  details: string;
  hint?: string;
};

type PostgrestResponse<T> = {
  data: T | null;
  error: PostgrestError | null;
  count: number | null;
  status: number;
  statusText: string;
};

export const useDiscussions = (): UseDiscussionsReturn => {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  const transformDatabaseComment = useCallback(
    (
      dbComment: DatabaseComment & {
        author: { username: string; avatar_url: string | null };
      }
    ): Comment => ({
      ...dbComment,
      author: dbComment.author,
    }),
    []
  );

  const transformDatabaseDiscussion = useCallback(
    (dbDiscussion: DiscussionWithRelations): Discussion => ({
      ...dbDiscussion,
      author: dbDiscussion.author,
      comments_count: dbDiscussion.comments.count,
      commentList: (dbDiscussion.commentList || []).map(
        transformDatabaseComment
      ),
    }),
    [transformDatabaseComment]
  );

  useEffect(() => {
    const fetchDiscussions = async () => {
      try {
        setIsLoading(true);
        const response = await supabase
          .from('discussions')
          .select(
            `
            *,
            author:users!author_id(username, avatar_url),
            comments:comments(count),
            commentList:comments(
              *,
              author:users!author_id(username, avatar_url)
            )
          `
          )
          .order('created_at', { ascending: false });

        const result = response as PostgrestResponse<DiscussionWithRelations[]>;

        if (result.error) throw result.error;

        const transformedDiscussions = (result.data || []).map(
          transformDatabaseDiscussion
        );

        setDiscussions(transformedDiscussions);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error('Failed to fetch discussions')
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchDiscussions();

    const channel = supabase
      .channel('discussions_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'discussions' },
        _payload => {
          fetchDiscussions();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        _payload => {
          fetchDiscussions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, transformDatabaseDiscussion, transformDatabaseComment]);

  const addDiscussion = useCallback(
    async (
      discussionData: Omit<
        BaseDiscussion,
        'id' | 'upvotes' | 'created_at' | 'updated_at' | 'author_id'
      >
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('Not authenticated');

        const insertData = {
          title: discussionData.title,
          content: discussionData.content,
          game: discussionData.game,
          challenge_type: discussionData.challenge_type,
          author_id: userData.user.id,
          tags: discussionData.tags ? Array.from(discussionData.tags) : [],
          upvotes: 0,
        };

        const { data, error: supabaseError } = await supabase
          .from('discussions')
          .insert(insertData)
          .select(
            `
          *,
          author:users!author_id(username, avatar_url),
          comments:comments(count),
          commentList:comments(
            *,
            author:users!author_id(username, avatar_url)
          )
        `
          )
          .single();

        const result = {
          data,
          error: supabaseError,
        } as PostgrestResponse<DiscussionWithRelations>;

        if (result.error) throw result.error;
        if (!result.data) throw new Error('No data returned from insert');

        const transformedDiscussion = transformDatabaseDiscussion(result.data);
        return transformedDiscussion;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Failed to add discussion');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [supabase, transformDatabaseDiscussion]
  );

  const addComment = useCallback(
    async (
      discussionId: number,
      commentData: Omit<
        BaseComment,
        | 'id'
        | 'discussion_id'
        | 'upvotes'
        | 'created_at'
        | 'updated_at'
        | 'author_id'
      >
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('Not authenticated');

        const insertData = {
          discussion_id: discussionId,
          content: commentData.content,
          author_id: userData.user.id,
          upvotes: 0,
          parent_id: null,
        };

        const { data, error: supabaseError } = await supabase
          .from('comments')
          .insert(insertData)
          .select(
            `
          *,
          author:users!author_id(username, avatar_url)
        `
          )
          .single();

        const result = { data, error: supabaseError } as PostgrestResponse<
          DatabaseComment & {
            author: { username: string; avatar_url: string | null };
          }
        >;

        if (result.error) throw result.error;
        if (!result.data) throw new Error('No data returned from insert');

        const transformedComment = transformDatabaseComment(result.data);
        return transformedComment;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Failed to add comment');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [supabase, transformDatabaseComment]
  );

  const upvoteDiscussion = useCallback(
    async (discussionId: number) => {
      setIsLoading(true);
      setError(null);

      try {
        const { error: supabaseError } = await supabase.rpc(
          'increment_discussion_upvotes',
          {
            discussion_id: discussionId,
          } as const
        );

        if (supabaseError) throw supabaseError;

        setDiscussions(prev =>
          prev.map(discussion =>
            discussion.id === discussionId
              ? { ...discussion, upvotes: (discussion.upvotes || 0) + 1 }
              : discussion
          )
        );
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Failed to upvote discussion');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [supabase]
  );

  return {
    discussions,
    error,
    isLoading,
    addDiscussion,
    addComment,
    upvoteDiscussion,
  };
};
