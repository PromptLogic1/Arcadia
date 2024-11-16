import { renderHook } from '@testing-library/react'
import type { RenderHookOptions } from '@testing-library/react'
import type { ReactNode } from 'react'
import { Fragment, createElement } from 'react'
import type { BoardCell, Player } from '@/components/challenges/bingo-board/types/types'

// Render hook wrapper with proper typing
export function renderHookWithProviders<Result, Props>(
    render: (props: Props) => Result,
    options?: Omit<RenderHookOptions<Props>, 'wrapper'>
) {
    return renderHook(render, {
        ...options,
        wrapper: ({ children }: { children: ReactNode }) => 
            createElement(Fragment, null, children)
    })
}

// Test data generators
export const generateMockBoardCell = (overrides?: Partial<BoardCell>): BoardCell => ({
    text: 'Test Cell',
    colors: [],
    completedBy: [],
    blocked: false,
    isMarked: false,
    cellId: `cell-${Date.now()}`,
    ...overrides
})

export const generateMockPlayer = (overrides?: Partial<Player>): Player => ({
    id: 'test-player',
    name: 'Test Player',
    color: 'bg-blue-500',
    hoverColor: 'hover:bg-blue-600',
    team: 0,
    ...overrides
})

// Mock Supabase client
export const mockSupabaseClient = () => ({
    from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn()
    })),
    channel: jest.fn(() => ({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn()
    })),
    removeChannel: jest.fn(),
    auth: {
        getUser: jest.fn().mockResolvedValue({ 
            data: { user: { id: 'test-user', email: 'test@example.com' } }, 
            error: null 
        })
    }
})

// Test utilities
export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0))

// Type guards for testing
export const isValidBoardCell = (cell: unknown): cell is BoardCell => {
    if (!cell || typeof cell !== 'object') return false
    const c = cell as Partial<BoardCell>
    return (
        typeof c.text === 'string' &&
        Array.isArray(c.colors) &&
        Array.isArray(c.completedBy) &&
        typeof c.blocked === 'boolean' &&
        typeof c.isMarked === 'boolean' &&
        typeof c.cellId === 'string'
    )
}

// Test constants
export const TEST_CONSTANTS = {
    TIMEOUT: 1000,
    MAX_RETRIES: 3,
    MOCK_DELAY: 100
} as const

// Rest of the file remains the same... 