import { renderHook, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useTagSystem } from '@/components/challenges/bingo-board/hooks/useTagSystem'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Tag, TagCategory, TagStatus } from '@/components/challenges/bingo-board/types/tagsystem.types'
import { TagValidationService as _TagValidationService } from '@/components/challenges/bingo-board/services/tag-validation.service'

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn()
}))

// Add type definitions for Supabase events
interface _PostgresChangesFilter {
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  schema?: string
  table?: string
  filter?: string
}

type SupabaseEventCallback = (payload: { data: Tag }) => void

// Add type for mock methods with underscore prefix
interface _MockSupabaseMethods {
  select: jest.Mock
  insert: jest.Mock
  update: jest.Mock
  delete: jest.Mock
  upsert: jest.Mock
  eq: jest.Mock
  lt: jest.Mock
  lte: jest.Mock
  single: jest.Mock
  maybeSingle: jest.Mock
  order: jest.Mock
  in: jest.Mock
  on: jest.Mock
}

type MockMethods = Record<keyof _MockSupabaseMethods, jest.Mock>

// Add mock Supabase instance
const mockSupabase = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(),
  channel: jest.fn(),
  removeChannel: jest.fn()
}

// Create mock Supabase methods
const createMockSupabaseFrom = () => {
  const mockMethods: Required<MockMethods> = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    on: jest.fn().mockImplementation((_event: string, _filter: unknown, _callback: unknown) => mockMethods)
  }

  return mockMethods
}

// Add type for mock database response
type MockDbResponse = {
  id: string
  name: string
  type: Tag['type']
  category: TagCategory
  status: TagStatus
  description: string
  created_at: string
  updated_at: string
  usage_count: number
  votes: number
  tag_id?: string
}

// Add type for mock table responses with index signature
type MockTableResponse = {
  [key: string]: {
    insert?: jest.Mock
    update?: jest.Mock
    select?: jest.Mock
    delete?: jest.Mock
    upsert?: jest.Mock
  }
}

describe('useTagSystem', () => {
  const _mockUser = { id: 'test-user', email: 'test@example.com' }
  
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

  // Add mockTables at the describe block scope
  let mockTables: MockTableResponse

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup validation service mock first
    jest.spyOn(_TagValidationService.prototype, 'validateTag')
      .mockImplementation((tag: Tag) => {
        if (!tag.name || tag.name.length < 3) {
          return {
            isValid: false,
            errors: ['Tag name must be at least 3 characters']
          }
        }
        return {
          isValid: true,
          errors: []
        }
      })

    // Setup mock response data
    const mockDbResponse: MockDbResponse = {
      id: mockTag.id,
      name: mockTag.name,
      type: mockTag.type,
      category: mockTag.category,
      status: mockTag.status,
      description: mockTag.description,
      created_at: mockTag.createdAt.toISOString(),
      updated_at: mockTag.updatedAt.toISOString(),
      usage_count: mockTag.usageCount,
      votes: mockTag.votes
    }

    // Setup default mock responses with proper chaining
    const defaultMockFrom = {
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockDbResponse,
            error: null
          })
        })
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockDbResponse,
              error: null
            })
          })
        })
      }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockDbResponse,
            error: null
          }),
          order: jest.fn().mockResolvedValue({
            data: [mockDbResponse],
            error: null
          })
        })
      }),
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }),
      upsert: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [mockDbResponse],
          error: null
        })
      }),
      lte: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [mockDbResponse],
            error: null
          })
        })
      })
    }

    // Initialize mockTables with proper mock responses
    mockTables = {
      tags: defaultMockFrom,
      tag_reports: {
        ...defaultMockFrom,
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'report-1', tag_id: mockTag.id },
              error: null
            })
          })
        })
      },
      tag_history: {
        ...defaultMockFrom,
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [{
                id: 'history-1',
                tag_id: mockTag.id,
                action: 'update',
                changes: { name: 'new name' },
                performed_by: 'user-1',
                created_at: new Date().toISOString()
              }],
              error: null
            })
          })
        })
      }
    }

    // Setup Supabase client mock with proper table handling
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user', email: 'test@example.com' } },
      error: null
    })

    mockSupabase.from.mockImplementation((table: string) => 
      mockTables[table] || defaultMockFrom
    )

    ;(createClientComponentClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  // Add a wrapper function to ensure proper initialization
  const renderTagSystemHook = () => {
    const { result, rerender } = renderHook(() => useTagSystem())
    // Wait for initial render
    act(() => {
      rerender()
    })
    return { result, rerender }
  }

  it('should initialize with empty tag arrays', () => {
    const { result } = renderTagSystemHook()
    expect(result.current.coreTags).toEqual([])
    expect(result.current.communityTags).toEqual([])
    expect(result.current.proposedTags).toEqual([])
    expect(result.current.selectedTags).toEqual([])
    expect(result.current.loading).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('should add a new tag', async () => {
    const { result } = renderTagSystemHook()
    const newTag = { ...mockTag, id: 'new-tag' }

    const mockFrom = createMockSupabaseFrom()
    mockSupabase.from.mockReturnValue(mockFrom)
    mockFrom.insert.mockImplementation(() => ({
      ...mockFrom,
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          ...newTag,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        error: null
      })
    }))

    await act(async () => {
      await result.current.addTag(newTag)
    })

    expect(result.current.coreTags).toContainEqual(expect.objectContaining({
      id: 'new-tag',
      name: mockTag.name
    }))
  })

  it('should remove a tag', async () => {
    const { result } = renderTagSystemHook()
    const mockFrom = createMockSupabaseFrom()
    
    // First, setup mock for insert to add the tag
    mockSupabase.from.mockReturnValue({
      ...mockFrom,
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              ...mockTag,
              created_at: mockTag.createdAt.toISOString(),
              updated_at: mockTag.updatedAt.toISOString(),
              usage_count: mockTag.usageCount
            },
            error: null
          })
        })
      }),
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ 
          data: null, 
          error: null 
        })
      })
    })

    await act(async () => {
      await result.current.addTag(mockTag)
      await result.current.removeTag(mockTag.id)
    })

    expect(result.current.coreTags).not.toContainEqual(mockTag)
  })

  it('should update a tag', async () => {
    const { result } = renderTagSystemHook()
    const updatedTag = { ...mockTag, name: 'Updated Name' }
    const mockFrom = createMockSupabaseFrom()
    
    // Setup mock for both insert and update operations
    mockSupabase.from.mockReturnValue({
      ...mockFrom,
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              ...mockTag,
              created_at: mockTag.createdAt.toISOString(),
              updated_at: mockTag.updatedAt.toISOString()
            },
            error: null
          })
        })
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                ...updatedTag,
                created_at: updatedTag.createdAt.toISOString(),
                updated_at: new Date().toISOString()
              },
              error: null
            })
          })
        })
      })
    })

    await act(async () => {
      // First add the tag
      await result.current.addTag(mockTag)
      // Then update it
      await result.current.updateTag(mockTag.id, { name: 'Updated Name' })
    })

    expect(result.current.coreTags[0]?.name).toBe('Updated Name')
  })

  it('should handle tag selection', async () => {
    const { result } = renderTagSystemHook()
    const mockFrom = createMockSupabaseFrom()

    // Setup mock for insert
    mockSupabase.from.mockReturnValue({
      ...mockFrom,
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              ...mockTag,
              created_at: mockTag.createdAt.toISOString(),
              updated_at: mockTag.updatedAt.toISOString()
            },
            error: null
          })
        })
      })
    })

    await act(async () => {
      // First add the tag
      await result.current.addTag(mockTag)
      // Then select it
      result.current.selectTag(mockTag.id)
    })

    expect(result.current.selectedTags).toContainEqual(expect.objectContaining({
      id: mockTag.id,
      name: mockTag.name
    }))
  })

  it('should handle tag deselection', async () => {
    const { result } = renderTagSystemHook()

    await act(async () => {
      await result.current.addTag(mockTag)
      result.current.selectTag(mockTag.id)
      result.current.deselectTag(mockTag.id)
    })

    expect(result.current.selectedTags).not.toContainEqual(mockTag)
  })

  it('should validate tags correctly', () => {
    const { result } = renderTagSystemHook()
    
    const validationResult = result.current.validateTag(mockTag)
    expect(validationResult).toEqual({
      isValid: true,
      errors: []
    })

    const shortTag = { ...mockTag, name: 'ab' }
    const shortTagValidation = result.current.validateTag(shortTag)
    expect(shortTagValidation).toEqual({
      isValid: false,
      errors: ['Tag name must be at least 3 characters']
    })
  })

  it('should handle tag voting', async () => {
    const { result } = renderTagSystemHook()
    const mockFrom = createMockSupabaseFrom()

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'tag_votes') {
        return {
          ...mockFrom,
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'vote-1', tag_id: mockTag.id, vote: 'up' },
                error: null
              })
            })
          })
        }
      }
      return mockTables[table] || createMockSupabaseFrom()
    })

    await act(async () => {
      await result.current.addTag(mockTag)
      await result.current.voteTag(mockTag.id, 'up')
    })

    expect(result.current.coreTags[0]?.votes).toBe(mockTag.votes + 1)
  })

  it('should get popular tags', async () => {
    const { result } = renderTagSystemHook()
    const popularTag = { ...mockTag, usageCount: 10 }

    const mockFrom = createMockSupabaseFrom()
    mockSupabase.from.mockReturnValue({
      ...mockFrom,
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              ...popularTag,
              created_at: popularTag.createdAt.toISOString(),
              updated_at: popularTag.updatedAt.toISOString(),
              usage_count: popularTag.usageCount
            },
            error: null
          })
        })
      })
    })

    await act(async () => {
      await result.current.addTag(popularTag)
    })

    const popularTags = result.current.getPopularTags(1)
    expect(popularTags).toHaveLength(1)
    expect(popularTags[0]?.id).toBe(popularTag.id)
  })

  it('should get tags by category', async () => {
    const { result } = renderTagSystemHook()
    const difficultyTag = mockTag
    const timeTag = { 
      ...mockTag, 
      id: 'tag-2', 
      category: { 
        ...mockCategory, 
        name: 'timeInvestment' as const
      } 
    }

    const mockFrom = createMockSupabaseFrom()
    mockSupabase.from.mockReturnValue({
      ...mockFrom,
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              ...mockTag,
              created_at: mockTag.createdAt.toISOString(),
              updated_at: mockTag.updatedAt.toISOString(),
              usage_count: mockTag.usageCount
            },
            error: null
          })
        })
      })
    })

    await act(async () => {
      await result.current.addTag(difficultyTag)
      await result.current.addTag(timeTag)
    })

    const difficultyTags = result.current.getTagsByCategory('difficulty')
    expect(difficultyTags).toHaveLength(1)
    expect(difficultyTags[0]?.id).toBe(difficultyTag.id)
  })

  it('should handle tag subscription', async () => {
    const { result } = renderTagSystemHook()
    const mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis()
    }

    mockSupabase.channel.mockReturnValue(mockChannel)

    const updatedTag = { ...mockTag, name: 'Updated via subscription' }

    await act(async () => {
      const unsubscribe = result.current.subscribeTag(mockTag.id, (tag) => {
        expect(tag).toEqual(updatedTag)
      })
      
      // Get the callback from the on method call
      const onCall = mockChannel.on.mock.calls[0]
      if (onCall && onCall[2]) {
        const cb = onCall[2] as SupabaseEventCallback
        cb({ data: updatedTag })
      }
      
      unsubscribe()
    })
  })

  it('should handle errors gracefully', async () => {
    const { result } = renderTagSystemHook()
    const mockFrom = createMockSupabaseFrom()
    const error = new Error('Insert failed')
    
    mockSupabase.from.mockReturnValue({
      ...mockFrom,
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockRejectedValue(error)
        })
      })
    })

    await act(async () => {
      try {
        await result.current.addTag(mockTag)
      } catch (err) {
        // Error will be caught
      }
    })

    expect(result.current.error).toEqual(error)
  })

  it('should handle tag archival', async () => {
    const { result } = renderTagSystemHook()
    const oldTag = { 
      ...mockTag, 
      updatedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
      usageCount: 0 
    }

    // Setup mock for both insert and update
    const mockFrom = createMockSupabaseFrom()
    mockSupabase.from.mockReturnValue({
      ...mockFrom,
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              ...oldTag,
              created_at: oldTag.createdAt.toISOString(),
              updated_at: oldTag.updatedAt.toISOString(),
              usage_count: oldTag.usageCount
            },
            error: null
          })
        })
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({
                data: [{ ...oldTag, status: 'archived' }],
                error: null
              })
            })
          })
        })
      })
    })

    await act(async () => {
      await result.current.addTag(oldTag)
      await result.current.archiveInactiveTags()
    })

    expect(result.current.coreTags[0]?.status).toBe('archived')
  })

  it('should handle tag cleanup', async () => {
    const { result } = renderTagSystemHook()
    const suspendedTag = { ...mockTag, status: 'suspended' as const }

    // Setup mock for both insert and delete
    const mockFrom = createMockSupabaseFrom()
    mockSupabase.from.mockReturnValue({
      ...mockFrom,
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              ...suspendedTag,
              created_at: suspendedTag.createdAt.toISOString(),
              updated_at: suspendedTag.updatedAt.toISOString()
            },
            error: null
          })
        })
      }),
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ 
          data: null, 
          error: null 
        })
      })
    })

    await act(async () => {
      await result.current.addTag(suspendedTag)
      await result.current.cleanupTags()
    })

    expect(mockSupabase.from).toHaveBeenCalledWith('tags')
    expect(result.current.coreTags).not.toContainEqual(expect.objectContaining({
      id: suspendedTag.id
    }))
  })

  it('should handle tag reporting', async () => {
    const { result } = renderTagSystemHook()
    const reportReason = 'inappropriate content'
    
    // Setup mock for both tags and tag_reports tables
    mockSupabase.from = jest.fn().mockImplementation((table: string) => {
      if (table === 'tags') {
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  ...mockTag,
                  created_at: mockTag.createdAt.toISOString(),
                  updated_at: mockTag.updatedAt.toISOString()
                },
                error: null
              })
            })
          })
        }
      }
      if (table === 'tag_reports') {
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'report-1', tag_id: mockTag.id, reason: reportReason },
                error: null
              })
            })
          })
        }
      }
      return createMockSupabaseFrom()
    })

    await act(async () => {
      await result.current.addTag(mockTag)
      await result.current.reportTag(mockTag.id, reportReason)
    })

    expect(mockSupabase.from).toHaveBeenCalledWith('tag_reports')
  })

  it('should handle tag history retrieval', async () => {
    const { result } = renderTagSystemHook()
    const mockHistory = [{
      id: 'history-1',
      tag_id: mockTag.id,
      action: 'update' as const,
      changes: { name: 'new name' },
      performed_by: 'user-1',
      created_at: new Date().toISOString()
    }]

    // Setup mock for both tags and tag_history tables
    mockSupabase.from = jest.fn().mockImplementation((table: string) => {
      if (table === 'tags') {
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  ...mockTag,
                  created_at: mockTag.createdAt.toISOString(),
                  updated_at: mockTag.updatedAt.toISOString()
                },
                error: null
              })
            })
          })
        }
      }
      if (table === 'tag_history') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockHistory,
                error: null
              })
            })
          })
        }
      }
      return createMockSupabaseFrom()
    })

    await act(async () => {
      await result.current.addTag(mockTag)
      const history = await result.current.getTagHistory(mockTag.id)
      expect(history).toHaveLength(1)
      expect(history[0]).toEqual(expect.objectContaining({
        id: 'history-1',
        tagId: mockTag.id,
        action: 'update'
      }))
    })
  })

  it('should handle tag stats retrieval', async () => {
    const { result } = renderTagSystemHook()
    const mockStats = { usage_count: 5, votes: 10 }

    // Setup mock for both insert and select
    const mockFrom = createMockSupabaseFrom()
    mockSupabase.from.mockReturnValue({
      ...mockFrom,
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              ...mockTag,
              created_at: mockTag.createdAt.toISOString(),
              updated_at: mockTag.updatedAt.toISOString()
            },
            error: null
          })
        })
      }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockStats,
            error: null
          })
        })
      })
    })

    await act(async () => {
      await result.current.addTag(mockTag)
      const stats = await result.current.getTagStats(mockTag.id)
      expect(stats).toEqual({
        usageCount: mockStats.usage_count,
        votes: mockStats.votes
      })
    })
  })

  it('should handle batch updates', async () => {
    const { result } = renderTagSystemHook()
    const updates: Array<[string, Partial<Tag>]> = [
      [mockTag.id, { name: 'Updated Name 1' }],
      ['tag-2', { name: 'Updated Name 2' }]
    ]

    const mockFrom = createMockSupabaseFrom()
    mockSupabase.from.mockReturnValue({
      ...mockFrom,
      upsert: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: updates.map(([id, update]) => ({
            ...mockTag,
            id,
            ...update,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })),
          error: null
        })
      })
    })

    await act(async () => {
      await result.current.batchUpdate(updates)
    })

    expect(mockSupabase.from).toHaveBeenCalledWith('tags')
    expect(mockFrom.upsert).toHaveBeenCalled()
  })

  it('should handle concurrent tag updates', async () => {
    const { result } = renderTagSystemHook()
    const update1 = { name: 'Update 1' }
    const update2 = { name: 'Update 2' }

    // Setup mock for both insert and update
    const mockFrom = createMockSupabaseFrom()
    mockSupabase.from.mockReturnValue({
      ...mockFrom,
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              ...mockTag,
              created_at: mockTag.createdAt.toISOString(),
              updated_at: mockTag.updatedAt.toISOString()
            },
            error: null
          })
        })
      }),
      update: jest.fn().mockImplementation((data) => ({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { ...mockTag, ...data, updated_at: new Date().toISOString() },
              error: null
            })
          })
        })
      }))
    })

    await act(async () => {
      await result.current.addTag(mockTag)
      await Promise.all([
        result.current.updateTag(mockTag.id, update1),
        result.current.updateTag(mockTag.id, update2)
      ])
    })

    expect(result.current.coreTags[0]?.name).toBe('Update 2')
  })

  // Add proper cleanup
  afterEach(() => {
    jest.resetAllMocks()
  })

  afterAll(() => {
    jest.restoreAllMocks()
  })
})
