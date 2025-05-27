'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Discussion as BaseDiscussion, Comment } from '@/src/lib/stores/community-store'
import type { Database } from '@/types/database.types'

// Extended Discussion type that includes UI-specific properties
interface Discussion extends BaseDiscussion {
  comments?: number
  commentList?: Comment[]
}

interface UseDiscussionsReturn {
  discussions: readonly Discussion[]
  error: Error | null
  isLoading: boolean
  addDiscussion: (discussion: Omit<Discussion, 'id' | 'comments' | 'upvotes' | 'date' | 'commentList'>) => Promise<Discussion>
  addComment: (discussionId: number, comment: Omit<Comment, 'id' | 'date'>) => Promise<Comment>
  upvoteDiscussion: (discussionId: number) => Promise<void>
}

type DatabaseDiscussion = Database['public']['Tables']['discussions']['Row']
type DatabaseComment = Database['public']['Tables']['comments']['Row']

interface DiscussionWithRelations extends DatabaseDiscussion {
  author: {
    username: string
    avatar_url: string | null
  }
  comments: {
    count: number
  }
  commentList: Array<DatabaseComment & {
    author: {
      username: string
      avatar_url: string | null
    }
  }>
}

type PostgrestError = {
  code: string
  message: string
  details: string
  hint?: string
}

type PostgrestResponse<T> = {
  data: T | null
  error: PostgrestError | null
  count: number | null
  status: number
  statusText: string
}

export const useDiscussions = (): UseDiscussionsReturn => {
  const [discussions, setDiscussions] = useState<readonly Discussion[]>([])
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  const supabase = createClientComponentClient<Database>()

  const transformDatabaseComment = useCallback((dbComment: DatabaseComment & {
    author: {
      username: string
      avatar_url: string | null
    }
  }): Comment => ({
    id: dbComment.id,
    content: dbComment.content,
    created_at: dbComment.created_at,
    discussion_id: dbComment.discussion_id,
    updated_at: dbComment.updated_at,
    upvotes: dbComment.upvotes || 0,
    author_id: dbComment.author_id
  }), [])

  // Transform database types to our frontend types
  const transformDatabaseDiscussion = useCallback((dbDiscussion: DiscussionWithRelations): Discussion => ({
    id: dbDiscussion.id,
    title: dbDiscussion.title,
    content: dbDiscussion.content,
    game: dbDiscussion.game,
    challenge_type: dbDiscussion.challenge_type,
    upvotes: dbDiscussion.upvotes || 0,
    created_at: dbDiscussion.created_at,
    updated_at: dbDiscussion.updated_at,
    tags: dbDiscussion.tags || [],
    author_id: dbDiscussion.author_id
  }), [])

  useEffect(() => {
    const fetchDiscussions = async () => {
      try {
        const response = await supabase
          .from('discussions')
          .select(`
            *,
            author:users!author_id(username, avatar_url),
            comments:comments(count),
            commentList:comments(
              *,
              author:users!author_id(username, avatar_url)
            )
          `)
          .order('created_at', { ascending: false })

        // Type assertion after we get the response
        const result = response as PostgrestResponse<Array<{
          id: number
          title: string
          content: string
          game: string
          challenge_type: string | null
          tags: string[]
          upvotes: number
          author_id: string
          created_at: string
          updated_at: string
          author: { username: string; avatar_url: string | null }
          comments: { count: number }
          commentList: Array<{
            id: number
            content: string
            upvotes: number
            author_id: string
            discussion_id: number
            created_at: string
            updated_at: string
            author: { username: string; avatar_url: string | null }
          }>
        }>>

        if (result.error) throw result.error
        
        const transformedDiscussions = (result.data || []).map(discussion => ({
          ...discussion,
          author: discussion.author,
          comments: discussion.comments,
          commentList: discussion.commentList
        })).map(transformDatabaseDiscussion)

        setDiscussions(transformedDiscussions)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch discussions'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchDiscussions()

    const channel = supabase
      .channel('discussions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'discussions' }, 
        fetchDiscussions
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, transformDatabaseDiscussion])

  const addDiscussion = useCallback(async (discussion: Omit<Discussion, 'id' | 'comments' | 'upvotes' | 'date' | 'commentList'>) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not authenticated')

      const { data, error: supabaseError } = await supabase
        .from('discussions')
        .insert({
          title: discussion.title,
          content: discussion.content,
          game: discussion.game,
          challenge_type: discussion.challenge_type,
          author_id: userData.user.id,
          tags: discussion.tags ? Array.from(discussion.tags) : [],
          upvotes: 0
        })
        .select(`
          *,
          author:users!author_id(username, avatar_url),
          comments:comments(count),
          commentList:comments(
            *,
            author:users!author_id(username, avatar_url)
          )
        `)
        .single() as PostgrestResponse<DiscussionWithRelations>

      if (supabaseError) throw supabaseError
      if (!data) throw new Error('No data returned from insert')
      
      const transformedDiscussion = transformDatabaseDiscussion(data)
      setDiscussions(prev => [...prev, transformedDiscussion])
      return transformedDiscussion
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to add discussion')
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [supabase, transformDatabaseDiscussion])

  const addComment = useCallback(async (discussionId: number, comment: Omit<Comment, 'id' | 'date'>) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not authenticated')

      const { data, error: supabaseError } = await supabase
        .from('comments')
        .insert({
          discussion_id: discussionId,
          content: comment.content,
          author_id: userData.user.id,
          upvotes: 0
        })
        .select(`
          *,
          author:users!author_id(username, avatar_url)
        `)
        .single() as PostgrestResponse<DatabaseComment & {
          author: { username: string; avatar_url: string | null }
        }>

      if (supabaseError) throw supabaseError
      if (!data) throw new Error('No data returned from insert')

      const transformedComment = transformDatabaseComment(data)
      setDiscussions(prev => prev.map(discussion =>
        discussion.id === discussionId
          ? {
              ...discussion,
              comments: (discussion.comments || 0) + 1,
              commentList: [...(discussion.commentList || []), transformedComment]
            }
          : discussion
      ))

      return transformedComment
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to add comment')
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [supabase, transformDatabaseComment])

  const upvoteDiscussion = useCallback(async (discussionId: number) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const { error: supabaseError } = await supabase
        .rpc('increment_discussion_upvotes', {
          discussion_id: discussionId
        } as const)

      if (supabaseError) throw supabaseError

      setDiscussions(prev => prev.map(discussion =>
        discussion.id === discussionId
          ? { ...discussion, upvotes: (discussion.upvotes || 0) + 1 }
          : discussion
      ))
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to upvote discussion')
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  return {
    discussions,
    error,
    isLoading,
    addDiscussion,
    addComment,
    upvoteDiscussion
  }
} 