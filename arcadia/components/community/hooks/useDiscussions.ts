import { useState, useCallback } from 'react'
import type { Discussion, Comment } from '../types'
import { MOCK_DISCUSSIONS } from '../shared/constants'

interface UseDiscussionsReturn {
  discussions: readonly Discussion[]
  error: Error | null
  isLoading: boolean
  addDiscussion: (discussion: Omit<Discussion, 'id' | 'comments' | 'upvotes' | 'date' | 'commentList'>) => Promise<Discussion>
  addComment: (discussionId: number, comment: Omit<Comment, 'id' | 'date'>) => Promise<Comment>
  upvoteDiscussion: (discussionId: number) => Promise<void>
}

export const useDiscussions = (): UseDiscussionsReturn => {
  const [discussions, setDiscussions] = useState<readonly Discussion[]>(MOCK_DISCUSSIONS)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const addDiscussion = useCallback(async (discussion: Omit<Discussion, 'id' | 'comments' | 'upvotes' | 'date' | 'commentList'>) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const newDiscussion: Discussion = {
        ...discussion,
        id: Math.max(...discussions.map(d => d.id)) + 1,
        comments: 0,
        upvotes: 0,
        date: new Date().toISOString(),
        commentList: []
      }
      
      setDiscussions(prev => [...prev, newDiscussion])
      return newDiscussion
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to add discussion')
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [discussions])

  const addComment = useCallback(async (discussionId: number, comment: Omit<Comment, 'id' | 'date'>) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const newComment: Comment = {
        ...comment,
        id: Math.floor(Math.random() * 10000),
        date: new Date().toISOString()
      }

      setDiscussions(prev => prev.map(discussion =>
        discussion.id === discussionId
          ? {
              ...discussion,
              comments: discussion.comments + 1,
              commentList: [...discussion.commentList, newComment]
            }
          : discussion
      ))

      return newComment
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to add comment')
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const upvoteDiscussion = useCallback(async (discussionId: number) => {
    setIsLoading(true)
    setError(null)
    
    try {
      setDiscussions(prev => prev.map(discussion =>
        discussion.id === discussionId
          ? { ...discussion, upvotes: discussion.upvotes + 1 }
          : discussion
      ))
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to upvote discussion')
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    discussions,
    error,
    isLoading,
    addDiscussion,
    addComment,
    upvoteDiscussion
  }
} 