import { renderHook, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useTagSystem } from '@/components/challenges/bingo-board/hooks/useTagSystem'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Tag, TagCategory } from '@/components/challenges/bingo-board/types/tagsystem.types'

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn()
}))

describe('useTagSystem', () => {
  const mockUser = { id: 'test-user', email: 'test@example.com' }
  
  const mockCategory: TagCategory = {
    id: 'cat-1',
    name: 'difficulty',
    isRequired: true,
    allowMultiple: false,
    validForGames: ['all']
  }

  const mockTag: Tag = {
    id: 'tag-1',
    name: 'Test Tag',
    type: 'core',
    category: mockCategory,
    status: 'active',
    description: 'Test description',
    createdAt: new Date(),
    updatedAt: new Date(),
    usageCount: 0,
    votes: 0
  }

  const mockSupabase = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null })
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockResolvedValue({ data: null, error: null }),
      delete: jest.fn().mockResolvedValue({ data: null, error: null }),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
    }),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn()
    }))
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClientComponentClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  it('should initialize with empty tag arrays', () => {
    const { result } = renderHook(() => useTagSystem())
    expect(result.current.coreTags).toEqual([])
    expect(result.current.communityTags).toEqual([])
    expect(result.current.proposedTags).toEqual([])
    expect(result.current.selectedTags).toEqual([])
    expect(result.current.loading).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('should add a new tag', async () => {
    const { result } = renderHook(() => useTagSystem())
    const newTag = { ...mockTag, id: 'new-tag' }

    mockSupabase.from().insert.mockResolvedValueOnce({
      data: newTag,
      error: null
    })

    await act(async () => {
      await result.current.addTag(newTag)
    })

    expect(result.current.coreTags).toContainEqual(expect.objectContaining({
      id: 'new-tag',
      name: mockTag.name
    }))
  })

  it('should remove a tag', async () => {
    const { result } = renderHook(() => useTagSystem())
    
    // First add a tag
    await act(async () => {
      result.current.coreTags = [mockTag]
    })

    await act(async () => {
      await result.current.removeTag(mockTag.id)
    })

    expect(result.current.coreTags).not.toContainEqual(mockTag)
  })

  it('should update a tag', async () => {
    const { result } = renderHook(() => useTagSystem())
    const updatedTag = { ...mockTag, name: 'Updated Name' }

    mockSupabase.from().update.mockResolvedValueOnce({
      data: updatedTag,
      error: null
    })

    await act(async () => {
      result.current.coreTags = [mockTag]
      await result.current.updateTag(mockTag.id, { name: 'Updated Name' })
    })

    const foundTag = result.current.coreTags.find(t => t.id === mockTag.id)
    expect(foundTag?.name).toBe('Updated Name')
  })

  it('should handle tag selection', () => {
    const { result } = renderHook(() => useTagSystem())

    act(() => {
      result.current.coreTags = [mockTag]
      result.current.selectTag(mockTag.id)
    })

    expect(result.current.selectedTags).toContainEqual(mockTag)
  })

  it('should handle tag deselection', () => {
    const { result } = renderHook(() => useTagSystem())

    act(() => {
      result.current.coreTags = [mockTag]
      result.current.selectedTags = [mockTag]
      result.current.deselectTag(mockTag.id)
    })

    expect(result.current.selectedTags).not.toContainEqual(mockTag)
  })

  it('should validate tags correctly', () => {
    const { result } = renderHook(() => useTagSystem())
    
    const validationResult = result.current.validateTag(mockTag)
    expect(validationResult.isValid).toBe(true)
    expect(validationResult.errors).toHaveLength(0)

    const invalidTag = { ...mockTag, name: '' }
    const invalidValidation = result.current.validateTag(invalidTag)
    expect(invalidValidation.isValid).toBe(false)
    expect(invalidValidation.errors.length).toBeGreaterThan(0)
  })

  it('should handle tag voting', async () => {
    const { result } = renderHook(() => useTagSystem())

    await act(async () => {
      result.current.coreTags = [mockTag]
      await result.current.voteTag(mockTag.id, 'up')
    })

    const votedTag = result.current.coreTags.find(t => t.id === mockTag.id)
    expect(votedTag?.votes).toBe(1)
  })

  it('should get popular tags', () => {
    const { result } = renderHook(() => useTagSystem())
    const popularTag = { ...mockTag, usageCount: 10 }
    const unpopularTag = { ...mockTag, id: 'tag-2', usageCount: 1 }

    act(() => {
      result.current.coreTags = [popularTag, unpopularTag]
    })

    const popularTags = result.current.getPopularTags(1)
    const firstTag = popularTags[0]
    expect(popularTags).toHaveLength(1)
    expect(firstTag?.id).toBe(popularTag.id)
  })

  it('should get tags by category', () => {
    const { result } = renderHook(() => useTagSystem())
    const difficultyTag = mockTag
    const timeTag = { 
      ...mockTag, 
      id: 'tag-2', 
      category: { 
        ...mockCategory, 
        name: 'timeInvestment' as const
      } 
    }

    act(() => {
      result.current.coreTags = [difficultyTag, timeTag]
    })

    const difficultyTags = result.current.getTagsByCategory('difficulty')
    const firstTag = difficultyTags[0]
    expect(difficultyTags).toHaveLength(1)
    expect(firstTag?.id).toBe(difficultyTag.id)
  })

  it('should handle tag subscription', async () => {
    const { result } = renderHook(() => useTagSystem())
    let callback: (payload: { data: Tag }) => void = () => {}

    mockSupabase.channel().on.mockImplementation((event, filter, cb) => {
      if (event === 'postgres_changes') {
        callback = cb
      }
      return mockSupabase.channel()
    })

    const updatedTag = { ...mockTag, name: 'Updated via subscription' }

    await act(async () => {
      const unsubscribe = result.current.subscribeTag(mockTag.id, (tag) => {
        expect(tag).toEqual(updatedTag)
      })
      callback({ data: updatedTag })
      unsubscribe()
    })
  })

  it('should handle errors gracefully', async () => {
    const { result } = renderHook(() => useTagSystem())
    
    mockSupabase.from().insert.mockRejectedValueOnce(new Error('Insert failed'))

    await act(async () => {
      try {
        await result.current.addTag(mockTag)
      } catch (error) {
        // Error should be caught
      }
    })

    expect(result.current.error).toBeTruthy()
  })
})

