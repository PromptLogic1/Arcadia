'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database.types'
import type { Tag, TagType, TagStatus, TagCategory, TagHistory } from '../types/tagsystem.types'
import { TAG_SYSTEM as _TAG_SYSTEM } from '../types/tagsystem.constants'
import { TagManagementService } from '../services/tag-management.service'
import { TagValidationService } from '../services/tag-validation.service'

interface UseTagSystem {
  // States
  coreTags: Tag[]
  communityTags: Tag[]
  proposedTags: Tag[]
  selectedTags: Tag[]
  loading: boolean
  error: Error | null

  // Tag Operations
  addTag: (tag: Partial<Tag>) => Promise<void>
  removeTag: (tagId: string) => Promise<void>
  updateTag: (tagId: string, updates: Partial<Tag>) => Promise<void>
  selectTag: (tagId: string) => void
  deselectTag: (tagId: string) => void

  // Validation & Voting
  validateTag: (tag: Partial<Tag>) => { isValid: boolean; errors: string[] }
  voteTag: (tagId: string, vote: 'up' | 'down') => Promise<void>
  reportTag: (tagId: string, reason: string) => Promise<void>

  // Stats & Info
  getTagStats: (tagId: string) => Promise<{ usageCount: number; votes: number }>
  getPopularTags: (limit?: number) => Tag[]
  getTagsByCategory: (category: TagCategory['name']) => Tag[]

  // Maintenance
  archiveInactiveTags: () => Promise<void>
  cleanupTags: () => Promise<void>

  // Subscription
  subscribeTag: (tagId: string, callback: (tag: Tag) => void) => () => void
  getTagHistory: (tagId: string) => Promise<TagHistory[]>
  batchUpdate: (updates: Array<[string, Partial<Tag>]>) => Promise<void>
}

export const useTagSystem = (_gameId?: string): UseTagSystem => {
  // States
  const [coreTags, setCoreTags] = useState<Tag[]>([])
  const [communityTags, setCommunityTags] = useState<Tag[]>([])
  const [proposedTags, setProposedTags] = useState<Tag[]>([])
  const [selectedTags, setSelectedTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Services
  const supabase = createClientComponentClient<Database>()
  const _tagManagementService = useMemo(() => new TagManagementService(), [])
  const _tagValidationService = useMemo(() => new TagValidationService(), [])

  // Add cache ref
  const tagCache = useRef<Map<string, Tag>>(new Map())

  // Add convertToTag helper function
  const convertToTag = useCallback((row: Database['public']['Tables']['tags']['Row']): Tag => ({
    id: row.id,
    name: row.name,
    type: row.type,
    category: {
      id: row.category.id,
      name: row.category.name as TagCategory['name'],
      isRequired: row.category.isRequired,
      allowMultiple: row.category.allowMultiple,
      validForGames: row.category.validForGames
    },
    status: row.status,
    description: row.description,
    game: row.game,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    usageCount: row.usage_count,
    votes: row.votes,
    createdBy: row.created_by
  }), [])

  // Load Tags
  useEffect(() => {
    const loadTags = async () => {
      try {
        const [coreResult, communityResult, proposedResult] = await Promise.all([
          supabase.from('tags').select('*').eq('type', 'core'),
          supabase.from('tags').select('*').eq('type', 'community').eq('status', 'verified'),
          supabase.from('tags').select('*').eq('status', 'proposed')
        ])

        if (coreResult.error) throw coreResult.error
        if (communityResult.error) throw communityResult.error
        if (proposedResult.error) throw proposedResult.error

        // Convert database rows to Tag type
        const convertToTag = (row: Database['public']['Tables']['tags']['Row']): Tag => ({
          id: row.id,
          name: row.name,
          type: row.type as TagType,
          category: row.category as TagCategory,
          status: row.status as TagStatus,
          description: row.description,
          game: row.game,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
          usageCount: row.usage_count,
          votes: row.votes,
          createdBy: row.created_by
        })

        setCoreTags(coreResult.data.map(convertToTag))
        setCommunityTags(communityResult.data.map(convertToTag))
        setProposedTags(proposedResult.data.map(convertToTag))
        setError(null)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    loadTags()
  }, [supabase])

  // Tag Operations
  const addTag = useCallback(async (tag: Partial<Tag>) => {
    try {
      const validation = _tagValidationService.validateTag(tag as Tag)
      if (!validation) throw new Error('Invalid tag')

      // Use type assertion to match database schema
      const tagData: Database['public']['Tables']['tags']['Insert'] = {
        name: tag.name || '',
        type: (tag.type as 'core' | 'game' | 'community') || 'community',
        status: 'proposed',
        description: tag.description || '',
        category: tag.category || {
          id: '',
          name: 'custom',
          isRequired: false,
          allowMultiple: true,
          validForGames: []
        },
        usage_count: 0,
        votes: 0,
        game: tag.game
      }

      const { data, error: insertError } = await supabase
        .from('tags')
        .insert(tagData)
        .select()
        .single()

      if (insertError) throw insertError

      const newTag = {
        ...data,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.created_at),
        type: data.type,
        category: data.category,
        status: data.status,
        description: data.description,
        usageCount: data.usage_count,
        votes: data.votes
      } as Tag

      if (data.type === 'core') {
        setCoreTags(prev => [...prev, newTag])
      } else {
        setProposedTags(prev => [...prev, newTag])
      }

      if (newTag) {
        tagCache.current.set(newTag.id, newTag)
      }
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }, [supabase, _tagValidationService])

  const removeTag = useCallback(async (tagId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId)

      if (deleteError) throw deleteError

      setCoreTags(prev => prev.filter(tag => tag.id !== tagId))
      setCommunityTags(prev => prev.filter(tag => tag.id !== tagId))
      setProposedTags(prev => prev.filter(tag => tag.id !== tagId))
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }, [supabase])

  const updateTag = useCallback(async (tagId: string, updates: Partial<Tag>) => {
    try {
      const { data, error: updateError } = await supabase
        .from('tags')
        .update({
          name: updates.name,
          description: updates.description,
          status: updates.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', tagId)
        .select()
        .single()

      if (updateError) throw updateError

      const updatedTag = {
        ...data,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        type: data.type as TagType,
        category: data.category as TagCategory,
        status: data.status as TagStatus,
        usageCount: data.usage_count || 0,
        votes: data.votes || 0
      } as Tag

      // Update local state based on tag type
      if (updatedTag.type === 'core') {
        setCoreTags(prev => prev.map(tag => tag.id === tagId ? updatedTag : tag))
      } else if (updatedTag.status === 'verified') {
        setCommunityTags(prev => prev.map(tag => tag.id === tagId ? updatedTag : tag))
      } else {
        setProposedTags(prev => prev.map(tag => tag.id === tagId ? updatedTag : tag))
      }
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }, [supabase])

  const selectTag = useCallback((tagId: string) => {
    const tag = [...coreTags, ...communityTags, ...proposedTags].find(t => t.id === tagId)
    if (tag) {
      setSelectedTags(prev => [...prev, tag])
    }
  }, [coreTags, communityTags, proposedTags])

  const deselectTag = useCallback((tagId: string) => {
    setSelectedTags(prev => prev.filter(tag => tag.id !== tagId))
  }, [])

  // Validation & Voting
  const validateTag = useCallback((tag: Partial<Tag>): { isValid: boolean; errors: string[] } => {
    const validation = _tagValidationService.validateTag(tag as Tag)
    return {
      isValid: validation,
      errors: validation ? [] : ['Invalid tag']
    }
  }, [_tagValidationService])

  const voteTag = useCallback(async (tagId: string, vote: 'up' | 'down') => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error: voteError } = await supabase
        .from('tag_votes')
        .insert({
          tag_id: tagId,
          user_id: user.id,
          vote,
          timestamp: new Date().toISOString()
        })
        .select()
        .single()

      if (voteError) throw voteError

      // Update local tag vote count
      const updateTags = (tags: Tag[]) =>
        tags.map(tag => tag.id === tagId ? { ...tag, votes: tag.votes + (vote === 'up' ? 1 : -1) } : tag)

      setCoreTags(updateTags)
      setCommunityTags(updateTags)
      setProposedTags(updateTags)

    } catch (err) {
      setError(err as Error)
      throw err
    }
  }, [supabase])

  const reportTag = useCallback(async (tagId: string, reason: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error: reportError } = await supabase
        .from('tag_reports')
        .insert({
          tag_id: tagId,
          user_id: user.id,
          reason,
          timestamp: new Date().toISOString()
        })
        .select()
        .single()

      if (reportError) throw reportError
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }, [supabase])

  // Stats & Info
  const getTagStats = useCallback(async (tagId: string) => {
    try {
      const cached = tagCache.current.get(tagId)
      if (cached) {
        return {
          usageCount: cached.usageCount,
          votes: cached.votes
        }
      }

      const { data, error } = await supabase
        .from('tags')
        .select('usage_count, votes')
        .eq('id', tagId)
        .single()

      if (error) throw error

      return {
        usageCount: data.usage_count || 0,
        votes: data.votes || 0
      }
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }, [supabase])

  const getPopularTags = useCallback((limit = 10) => {
    const allTags = [...coreTags, ...communityTags]
    return allTags
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit)
  }, [coreTags, communityTags])

  const getTagsByCategory = useCallback((category: TagCategory['name']) => {
    return [...coreTags, ...communityTags].filter(tag => tag.category.name === category)
  }, [coreTags, communityTags])

  // Maintenance
  const archiveInactiveTags = useCallback(async () => {
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    try {
      const { error } = await supabase
        .from('tags')
        .update({ status: 'archived' as const })
        .eq('status', 'active')
        .lt('updated_at', threeMonthsAgo.toISOString())
        .eq('usage_count', 0)

      if (error) throw error

      // Update local state
      const updateTags = (prevTags: Tag[]) =>
        prevTags.map(tag => 
          tag.status === 'active' && 
          tag.updatedAt < threeMonthsAgo && 
          tag.usageCount === 0
            ? { ...tag, status: 'archived' as TagStatus }
            : tag
        )

      setCoreTags(updateTags)
      setCommunityTags(updateTags)
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }, [supabase])

  const cleanupTags = useCallback(async () => {
    try {
      const { error: cleanupError } = await supabase
        .from('tags')
        .delete()
        .eq('status', 'suspended')

      if (cleanupError) throw cleanupError

      setCoreTags(prev => prev.filter(tag => tag.status !== 'suspended'))
      setCommunityTags(prev => prev.filter(tag => tag.status !== 'suspended'))
      setProposedTags(prev => prev.filter(tag => tag.status !== 'suspended'))
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }, [supabase])

  // Subscription
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
          const newTag = convertToTag(payload.new as Database['public']['Tables']['tags']['Row'])
          tagCache.current.set(tagId, newTag)
          callback(newTag)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, convertToTag])

  // Subscription
  const getTagHistory = useCallback(async (tagId: string) => {
    try {
      const { data, error } = await supabase
        .from('tag_history')
        .select('*')
        .eq('tag_id', tagId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data.map(entry => ({
        id: entry.id,
        tagId: entry.tag_id,
        action: entry.action,
        changes: entry.changes,
        performedBy: entry.performed_by,
        timestamp: new Date(entry.created_at)
      })) as TagHistory[]
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }, [supabase])

  // Fix batchUpdate function
  const batchUpdate = useCallback(async (updates: Array<[string, Partial<Tag>]>) => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .upsert(updates.map(([_, update]) => ({
          name: update.name || '',
          type: update.type || 'community',
          category: update.category ? {
            id: update.category.id,
            name: update.category.name,
            isRequired: update.category.isRequired,
            allowMultiple: update.category.allowMultiple,
            validForGames: update.category.validForGames
          } : {
            id: '',
            name: 'custom',
            isRequired: false,
            allowMultiple: true,
            validForGames: []
          },
          status: update.status || 'proposed',
          description: update.description || '',
          game: update.game,
          usage_count: 0,
          votes: 0
        }) satisfies Omit<Database['public']['Tables']['tags']['Row'], 'id' | 'created_at' | 'updated_at'>))
        .select()

      if (error) throw error

      // Update local state and cache
      const updatedTags = (data || []).map(convertToTag)
      updatedTags.forEach(tag => {
        tagCache.current.set(tag.id, tag)
        
        if (tag.type === 'core') {
          setCoreTags(prev => prev.map(t => t.id === tag.id ? tag : t))
        } else if (tag.status === 'verified') {
          setCommunityTags(prev => prev.map(t => t.id === tag.id ? tag : t))
        } else {
          setProposedTags(prev => prev.map(t => t.id === tag.id ? tag : t))
        }
      })
    } catch (err) {
      setError(err as Error)
      throw err
    }
  }, [supabase, convertToTag])

  return {
    // States
    coreTags,
    communityTags,
    proposedTags,
    selectedTags,
    loading,
    error,

    // Operations
    addTag,
    removeTag,
    updateTag,
    selectTag,
    deselectTag,

    // Validation & Voting
    validateTag,
    voteTag,
    reportTag,

    // Stats & Info
    getTagStats,
    getPopularTags,
    getTagsByCategory,

    // Maintenance
    archiveInactiveTags,
    cleanupTags,

    // Subscription
    subscribeTag,
    getTagHistory,
    batchUpdate
  }
}
