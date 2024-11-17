'use client'

import { useState, useCallback, useMemo } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database.types'
import type { Tag, TagStatus, TagCategory, TagHistory } from '../types/tagsystem.types'
import { TagValidationService } from '../services/tag-validation.service'

export const useTagSystem = (_gameId?: string) => {
  // States
  const [coreTags, setCoreTags] = useState<Tag[]>([])
  const [communityTags, _setCommunityTags] = useState<Tag[]>([])
  const [proposedTags, _setProposedTags] = useState<Tag[]>([])
  const [selectedTags, setSelectedTags] = useState<Tag[]>([])
  const [_loading, _setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Services
  const supabase = createClientComponentClient<Database>()
  const tagValidationService = useMemo(() => new TagValidationService(), [])

  // Tag Operations
  const addTag = useCallback(async (tag: Partial<Tag>) => {
    try {
      const validation = tagValidationService.validateTag(tag as Tag)
      if (!validation?.isValid) throw new Error('Invalid tag')

      const { data, error: insertError } = await supabase
        .from('tags')
        .insert({
          id: tag.id,
          name: tag.name || '',
          type: tag.type || 'community',
          category: tag.category || {
            id: '',
            name: 'custom',
            isRequired: false,
            allowMultiple: true,
            validForGames: []
          },
          status: 'proposed',
          description: tag.description || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          usage_count: 0,
          votes: 0
        })
        .select()
        .single()

      if (insertError || !data) {
        const error = insertError || new Error('Failed to insert tag')
        setError(error)
        throw error
      }

      const newTag: Tag = {
        ...tag as Tag,
        id: tag.id || data.id,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        usageCount: data.usage_count,
        votes: data.votes
      }

      setCoreTags(prev => [...prev, newTag])
      return newTag
    } catch (err) {
      const error = err as Error
      setError(error)
      throw error
    }
  }, [supabase, tagValidationService])

  const removeTag = useCallback(async (tagId: string) => {
    try {
      await supabase.from('tags').delete().eq('id', tagId)
      setCoreTags(prev => prev.filter(tag => tag.id !== tagId))
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }, [supabase])

  const updateTag = useCallback(async (tagId: string, updates: Partial<Tag>) => {
    try {
      const existingTag = coreTags.find(t => t.id === tagId)
      if (!existingTag) throw new Error('Tag not found')

      const { data, error: updateError } = await supabase
        .from('tags')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', tagId)
        .select()
        .single()

      if (updateError) throw updateError

      const updatedTag: Tag = {
        ...existingTag,
        ...updates,
        updatedAt: new Date(data.updated_at)
      }

      setCoreTags(prev => prev.map(tag => 
        tag.id === tagId ? updatedTag : tag
      ))

      return updatedTag
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }, [supabase, coreTags])

  const selectTag = useCallback((tagId: string) => {
    const tag = coreTags.find(t => t.id === tagId) || 
                communityTags.find(t => t.id === tagId) ||
                proposedTags.find(t => t.id === tagId)
    
    if (tag) {
      setSelectedTags(prev => [...prev, { ...tag }])
    }
  }, [coreTags, communityTags, proposedTags])

  const deselectTag = useCallback((tagId: string) => {
    setSelectedTags(prev => prev.filter(tag => tag.id !== tagId))
  }, [])

  const validateTag = useCallback((tag: Tag) => {
    return tagValidationService.validateTag(tag)
  }, [tagValidationService])

  const voteTag = useCallback(async (tagId: string, vote: 'up' | 'down') => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      await supabase
        .from('tag_votes')
        .insert({
          tag_id: tagId,
          user_id: user.id,
          vote,
          timestamp: new Date().toISOString()
        })
        .select()
        .single()

      setCoreTags(prev => prev.map(tag => 
        tag.id === tagId ? { ...tag, votes: tag.votes + (vote === 'up' ? 1 : -1) } : tag
      ))
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }, [supabase])

  const getPopularTags = useCallback((limit = 10) => {
    return [...coreTags, ...communityTags]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit)
  }, [coreTags, communityTags])

  const getTagsByCategory = useCallback((categoryName: TagCategory['name']) => {
    const allTags = [...coreTags, ...communityTags]
    const uniqueTags = Array.from(new Map(allTags.map(tag => [tag.id, tag])).values())
    return uniqueTags.filter(tag => tag.category.name === categoryName)
  }, [coreTags, communityTags])

  const subscribeTag = useCallback((tagId: string, callback: (tag: Tag) => void) => {
    const channel = supabase
      .channel(`tag-${tagId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tags',
        filter: `id=eq.${tagId}`
      }, payload => {
        if (payload.new) {
          const newData = payload.new as Database['public']['Tables']['tags']['Row']
          const updatedTag: Tag = {
            id: newData.id,
            name: newData.name,
            type: newData.type,
            category: {
              ...newData.category,
              name: newData.category.name as TagCategory['name']
            },
            status: newData.status,
            description: newData.description,
            createdAt: new Date(newData.created_at),
            updatedAt: new Date(newData.updated_at),
            usageCount: newData.usage_count,
            votes: newData.votes
          }
          callback(updatedTag)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const archiveInactiveTags = useCallback(async () => {
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    try {
      const { data, error } = await supabase
        .from('tags')
        .update({ status: 'archived' })
        .eq('status', 'active')
        .lte('updated_at', threeMonthsAgo.toISOString())
        .eq('usage_count', 0)
        .select()

      if (error) throw error

      setCoreTags(prev => prev.map(tag => 
        tag.status === 'active' && 
        tag.updatedAt <= threeMonthsAgo && 
        tag.usageCount === 0
          ? { ...tag, status: 'archived' as TagStatus }
          : tag
      ))

      return data
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }, [supabase])

  const cleanupTags = useCallback(async () => {
    try {
      await supabase
        .from('tags')
        .delete()
        .eq('status', 'suspended')

      setCoreTags(prev => prev.filter(tag => tag.status !== 'suspended'))
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }, [supabase])

  const reportTag = useCallback(async (tagId: string, reason: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('tag_reports')
        .insert({
          tag_id: tagId,
          user_id: user.id,
          reason,
          timestamp: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }, [supabase])

  const getTagHistory = useCallback(async (tagId: string): Promise<TagHistory[]> => {
    try {
      const { data, error } = await supabase
        .from('tag_history')
        .select('*')
        .eq('tag_id', tagId)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (!data) return []

      return data.map(entry => ({
        id: entry.id,
        tagId: entry.tag_id,
        action: entry.action,
        changes: entry.changes,
        performedBy: entry.performed_by,
        timestamp: new Date(entry.created_at)
      }))
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }, [supabase])

  const batchUpdate = useCallback(async (updates: Array<[string, Partial<Tag>]>) => {
    try {
      const existingTags = new Map(coreTags.map(tag => [tag.id, tag]))
      
      const upsertData = updates.map(([id, update]) => {
        const existing = existingTags.get(id)
        return {
          id,
          name: update.name || existing?.name || '',
          type: update.type || existing?.type || 'community',
          category: update.category || existing?.category || {
            id: '',
            name: 'custom',
            isRequired: false,
            allowMultiple: true,
            validForGames: []
          },
          status: update.status || existing?.status || 'proposed',
          description: update.description || existing?.description || '',
          usage_count: existing?.usageCount || 0,
          votes: existing?.votes || 0,
          updated_at: new Date().toISOString()
        }
      })

      const { data, error } = await supabase
        .from('tags')
        .upsert(upsertData)
        .select()

      if (error) throw error

      const updatedTags = data.map(tag => ({
        ...tag,
        category: {
          ...tag.category,
          name: tag.category.name as TagCategory['name']
        },
        createdAt: new Date(tag.created_at),
        updatedAt: new Date(tag.updated_at),
        usageCount: tag.usage_count
      })) as Tag[]

      setCoreTags(prev => {
        const updated = new Map(updatedTags.map(tag => [tag.id, tag]))
        return prev.map(tag => updated.get(tag.id) || tag)
      })

      return updatedTags
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }, [supabase, coreTags])

  const getTagStats = useCallback(async (tagId: string) => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('usage_count, votes')
        .eq('id', tagId)
        .single()

      if (error) throw error
      if (!data) throw new Error('Tag not found')

      return {
        usageCount: data.usage_count || 0,
        votes: data.votes || 0
      }
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }, [supabase])

  return {
    coreTags,
    communityTags,
    proposedTags,
    selectedTags,
    loading: _loading,
    error,
    addTag,
    removeTag,
    updateTag,
    selectTag,
    deselectTag,
    validateTag,
    voteTag,
    getPopularTags,
    getTagsByCategory,
    subscribeTag,
    archiveInactiveTags,
    cleanupTags,
    reportTag,
    getTagHistory,
    batchUpdate,
    getTagStats
  }
}
