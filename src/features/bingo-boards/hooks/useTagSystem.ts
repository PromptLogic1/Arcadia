'use client'

import { useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database, Tag, TagStatus, TagType, GameCategory, VoteType } from '@/types'
import type { UseTagSystemProps, UseTagSystemReturn } from '@/types/domains/bingo'

// Simple validation service since we're removing dependencies
const validateTag = (tag: Partial<Tag>) => {
  return {
    isValid: Boolean(tag.name && tag.name.length > 0),
    errors: []
  }
}

export const useTagSystem = ({ 
  initialTags = [], 
  gameType 
}: UseTagSystemProps = {}): UseTagSystemReturn => {
  // States - Use database types directly
  const [coreTags, setCoreTags] = useState<Tag[]>(Array.isArray(initialTags) ? [] : [])
  const [selectedTags, setSelectedTags] = useState<string[]>([]) // Use string IDs as per interface
  const [_loading, _setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Services
  const supabase = createClientComponentClient<Database>()

  // Tag Operations - Fix signature to match interface
  const addTag = useCallback(async (tagName: string): Promise<void> => {
    try {
      const validation = validateTag({ name: tagName })
      if (!validation?.isValid) throw new Error('Invalid tag')

      const { data, error: insertError } = await supabase
        .from('tags')
        .insert({
          name: tagName,
          type: 'community' as TagType,
          category: null, // Use null instead of object
          status: 'proposed' as TagStatus,
          description: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          usage_count: 0,
          votes: 0,
          created_by: null,
          game: gameType || null
        })
        .select()
        .single()

      if (insertError || !data) {
        const error = insertError || new Error('Failed to insert tag')
        setError(error)
        throw error
      }

      setCoreTags(prev => [...prev, data])
    } catch (err) {
      const error = err as Error
      setError(error)
      throw error
    }
  }, [supabase, gameType])

  const removeTag = useCallback(async (tagId: string) => {
    try {
      await supabase.from('tags').delete().eq('id', tagId)
      setCoreTags(prev => prev.filter(tag => tag.id !== tagId))
      setSelectedTags(prev => prev.filter(id => id !== tagId))
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }, [supabase])

  const selectTag = useCallback((tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) ? prev : [...prev, tagId]
    )
  }, [])

  const deselectTag = useCallback((tagId: string) => {
    setSelectedTags(prev => prev.filter(id => id !== tagId))
  }, [])

  const voteOnTag = useCallback(async (tagId: string, vote: 'up' | 'down'): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      await supabase
        .from('tag_votes')
        .insert({
          tag_id: tagId,
          user_id: user.id,
          vote: vote as VoteType, // Use VoteType directly
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      // Update tag votes count using database field names
      setCoreTags(prev => prev.map(tag => 
        tag.id === tagId ? { ...tag, votes: (tag.votes || 0) + (vote === 'up' ? 1 : -1) } : tag
      ))
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }, [supabase])

  return {
    tags: coreTags,
    selectedTags,
    loading: _loading,
    error,
    addTag,
    removeTag,
    selectTag,
    deselectTag,
    voteOnTag
  }
}
