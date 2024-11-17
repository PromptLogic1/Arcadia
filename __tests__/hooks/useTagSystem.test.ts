'use client'

import { renderHook, act, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useTagSystem } from '@/components/challenges/bingo-board/hooks/useTagSystem'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Tag, TagCategory } from '@/components/challenges/bingo-board/types/tagsystem.types'
import React from 'react'

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn(() => mockSupabase)
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

// Add type for mock database response with underscore prefix
type _MockDbResponse = {
  id: string
  name: string
  type: Tag['type']
  category: TagCategory
  status: Tag['status']
  description: string
  created_at: string
  updated_at: string
  usage_count: number
  votes: number
  tag_id?: string
}

// Add type for mock table responses with underscore prefix
type _MockTableResponse = {
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

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Improved default mock with complete tag structure
    const defaultTagResponse = {
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

    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: defaultTagResponse,
            error: null
          })
        })
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: defaultTagResponse,
              error: null
            })
          })
        })
      }),
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: null })
      }),
      upsert: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [defaultTagResponse],
          error: null
        })
      }),
      eq: jest.fn().mockReturnThis()
    })

    mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
      data: { user: { id: 'test-user' } },
      error: null
    })

    mockSupabase.channel = jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn()
    })

    ;(createClientComponentClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  // Update the renderTagSystemHook function
  const renderTagSystemHook = () => {
    // Reset the mock before each render with proper type
    ;(createClientComponentClient as jest.Mock).mockReturnValue(mockSupabase)
    
    return renderHook(() => useTagSystem(), {
      wrapper: ({ children }) => React.createElement(React.Fragment, null, children)
    })
  }

  // Update beforeAll to handle test timeouts
  beforeAll(() => {
    // Increase timeout for all tests
    jest.setTimeout(30000)
  })

  it('should initialize with empty tag arrays', async () => {
    const { result } = await renderTagSystemHook()
    expect(result.current.coreTags).toEqual([])
    expect(result.current.communityTags).toEqual([])
    expect(result.current.proposedTags).toEqual([])
    expect(result.current.selectedTags).toEqual([])
    expect(result.current.loading).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('should add a new tag', async () => {
    const { result } = await renderTagSystemHook()
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
    const { result } = await renderTagSystemHook()
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
    const initialTag = { 
      ...mockTag, 
      status: 'active' as const,
      type: 'core' as const
    }
    
    // Mock for adding and updating tag
    mockSupabase.from = jest.fn().mockImplementation((table: string) => {
      if (table === 'tags') {
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: initialTag.id,
                  name: initialTag.name,
                  type: initialTag.type,
                  category: initialTag.category,
                  status: initialTag.status,
                  description: initialTag.description,
                  created_at: initialTag.createdAt.toISOString(),
                  updated_at: initialTag.updatedAt.toISOString(),
                  usage_count: 0,
                  votes: 0
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
                    id: initialTag.id,
                    name: 'Updated Name',
                    type: initialTag.type,
                    category: initialTag.category,
                    status: initialTag.status,
                    description: initialTag.description,
                    created_at: initialTag.createdAt.toISOString(),
                    updated_at: new Date().toISOString(),
                    usage_count: 0,
                    votes: 0
                  },
                  error: null
                })
              })
            })
          })
        }
      }
      return createMockSupabaseFrom()
    })

    // Add and verify tag
    await act(async () => {
      const addedTag = await result.current.addTag(initialTag)
      expect(addedTag.status).toBe('active')
    })

    // Update and verify tag
    await act(async () => {
      const updatedTag = await result.current.updateTag(initialTag.id, { name: 'Updated Name' })
      expect(updatedTag.status).toBe('active')
      expect(updatedTag.name).toBe('Updated Name')
    })

    // Verify final state
    expect(result.current.coreTags[0]).toEqual(expect.objectContaining({
      id: initialTag.id,
      name: 'Updated Name',
      status: 'active'
    }))
  })

  it('should handle tag selection', async () => {
    const { result } = renderTagSystemHook()
    const tagToAdd = { 
      ...mockTag,
      status: 'active' as const,
      type: 'core' as const
    }
    
    // Mock that ensures tag is added to coreTags
    mockSupabase.from = jest.fn().mockImplementation((table: string) => {
      if (table === 'tags') {
        const tagData = {
          ...tagToAdd,
          created_at: tagToAdd.createdAt.toISOString(),
          updated_at: tagToAdd.updatedAt.toISOString(),
          usage_count: 0,
          votes: 0
        }
        
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: tagData,
                error: null
              })
            })
          })
        }
      }
      return createMockSupabaseFrom()
    })

    // Add the tag first
    let addedTag: Tag
    await act(async () => {
      addedTag = await result.current.addTag(tagToAdd)
    })

    // Verify tag was added correctly
    expect(addedTag!.status).toBe('active')
    expect(result.current.coreTags).toContainEqual(expect.objectContaining({
      id: tagToAdd.id,
      status: 'active'
    }))

    // Then select the tag
    await act(async () => {
      result.current.selectTag(tagToAdd.id)
    })

    expect(result.current.selectedTags).toContainEqual(expect.objectContaining({
      id: tagToAdd.id,
      name: tagToAdd.name
    }))
  })

  it('should handle tag deselection', async () => {
    const { result } = await renderTagSystemHook()

    await act(async () => {
      await result.current.addTag(mockTag)
      result.current.selectTag(mockTag.id)
      result.current.deselectTag(mockTag.id)
    })

    expect(result.current.selectedTags).not.toContainEqual(mockTag)
  })

  it('should validate tags correctly', async () => {
    const { result } = await renderTagSystemHook()
    
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
    
    const mockTagsTable = {
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              ...mockTag,
              created_at: mockTag.createdAt.toISOString(),
              updated_at: mockTag.updatedAt.toISOString(),
              usage_count: mockTag.usageCount,
              votes: mockTag.votes
            },
            error: null
          })
        })
      })
    }

    const mockVotesTable = {
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { 
              id: 'vote-1', 
              tag_id: mockTag.id, 
              vote: 'up',
              timestamp: new Date().toISOString()
            },
            error: null
          })
        })
      })
    }

    mockSupabase.from = jest.fn().mockImplementation((table: string) => {
      if (table === 'tags') return mockTagsTable
      if (table === 'tag_votes') return mockVotesTable
      return createMockSupabaseFrom()
    })

    await act(async () => {
      await result.current.addTag(mockTag)
      await result.current.voteTag(mockTag.id, 'up')
    })

    const updatedTag = result.current.coreTags.find(tag => tag.id === mockTag.id)
    expect(updatedTag?.votes).toBe(mockTag.votes + 1)
  })

  it('should get popular tags', async () => {
    const { result } = await renderTagSystemHook()
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
    const { result } = await renderTagSystemHook()
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
    const { result } = await renderTagSystemHook()
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
    const { result } = await renderTagSystemHook()
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
    const { result } = await renderTagSystemHook()
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
    const { result } = await renderTagSystemHook()
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
    const { result } = await renderTagSystemHook()
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
    const { result } = await renderTagSystemHook()
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
    const { result } = await renderTagSystemHook()
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
    const existingTag = { 
      ...mockTag,
      status: 'active' as const,
      type: 'core' as const
    }
    const newTag = {
      ...mockTag,
      id: 'tag-2',
      name: 'New Tag',
      status: 'active' as const,
      type: 'core' as const
    }

    const updates: Array<[string, Partial<Tag>]> = [
      [existingTag.id, { name: 'Updated Name 1' }],
      [newTag.id, { name: 'Updated Name 2' }]
    ]

    // Setup mock for both operations
    mockSupabase.from = jest.fn().mockImplementation((table: string) => {
      if (table === 'tags') {
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockImplementation(async () => ({
                data: {
                  id: existingTag.id,
                  name: existingTag.name,
                  type: 'core',
                  category: existingTag.category,
                  status: 'active',
                  description: existingTag.description,
                  created_at: existingTag.createdAt.toISOString(),
                  updated_at: existingTag.updatedAt.toISOString(),
                  usage_count: 0,
                  votes: 0
                },
                error: null
              }))
            })
          }),
          upsert: jest.fn().mockReturnValue({
            select: jest.fn().mockImplementation(async () => ({
              data: updates.map(([id, update]) => ({
                id,
                name: update.name,
                type: 'core',
                category: id === existingTag.id ? existingTag.category : newTag.category,
                status: 'active',
                description: id === existingTag.id ? existingTag.description : newTag.description,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                usage_count: 0,
                votes: 0
              })),
              error: null
            }))
          })
        }
      }
      return createMockSupabaseFrom()
    })

    // Add initial tag
    await act(async () => {
      await result.current.addTag(existingTag)
    })

    // Wait for tag to be added to coreTags
    await waitFor(() => {
      expect(result.current.coreTags).toContainEqual(
        expect.objectContaining({
          id: existingTag.id,
          status: 'active'
        })
      )
    })

    // Perform batch update
    await act(async () => {
      await result.current.batchUpdate(updates)
    })

    // Wait for state to update and verify final state
    await waitFor(() => {
      expect(result.current.coreTags).toHaveLength(2)
      expect(result.current.coreTags).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: existingTag.id,
            name: 'Updated Name 1',
            status: 'active'
          }),
          expect.objectContaining({
            id: newTag.id,
            name: 'Updated Name 2',
            status: 'active'
          })
        ])
      )
    })
  })

  it('should handle concurrent tag updates', async () => {
    const { result } = renderTagSystemHook()
    const initialTag = { 
      ...mockTag,
      status: 'active' as const,
      type: 'core' as const
    }
    const update1 = { name: 'Update 1' }
    const update2 = { name: 'Update 2' }

    // Setup mock for all operations
    mockSupabase.from = jest.fn().mockImplementation((table: string) => {
      if (table === 'tags') {
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockImplementation(async () => ({
                data: {
                  id: initialTag.id,
                  name: initialTag.name,
                  type: 'core',
                  category: initialTag.category,
                  status: 'active',
                  description: initialTag.description,
                  created_at: initialTag.createdAt.toISOString(),
                  updated_at: initialTag.updatedAt.toISOString(),
                  usage_count: 0,
                  votes: 0
                },
                error: null
              }))
            })
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockImplementation(async () => ({
                  data: {
                    id: initialTag.id,
                    name: 'Update 2',
                    type: 'core',
                    category: initialTag.category,
                    status: 'active',
                    description: initialTag.description,
                    created_at: initialTag.createdAt.toISOString(),
                    updated_at: new Date().toISOString(),
                    usage_count: 0,
                    votes: 0
                  },
                  error: null
                }))
              })
            })
          })
        }
      }
      return createMockSupabaseFrom()
    })

    // Add initial tag
    await act(async () => {
      await result.current.addTag(initialTag)
    })

    // Wait for tag to be added to coreTags
    await waitFor(() => {
      expect(result.current.coreTags).toContainEqual(
        expect.objectContaining({
          id: initialTag.id,
          status: 'active'
        })
      )
    })

    // Perform concurrent updates
    await act(async () => {
      await Promise.all([
        result.current.updateTag(initialTag.id, update1),
        result.current.updateTag(initialTag.id, update2)
      ])
    })

    // Wait for state to update and verify final state
    await waitFor(() => {
      const finalTag = result.current.coreTags.find(tag => tag.id === initialTag.id)
      expect(finalTag).toBeDefined()
      expect(finalTag).toEqual(expect.objectContaining({
        id: initialTag.id,
        name: 'Update 2',
        status: 'active'
      }))
    })
  })

  // Add proper cleanup
  afterEach(() => {
    jest.resetAllMocks()
  })

  afterAll(() => {
    jest.restoreAllMocks()
  })
})
