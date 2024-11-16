import { renderHook } from '@testing-library/react'
import type { RenderHookOptions, RenderHookResult } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'

export function renderHookWithProviders<Result, Props>(
    render: (props: Props) => Result,
    options?: Omit<RenderHookOptions<Props>, 'wrapper'>
): RenderHookResult<Result, Props> {
    return renderHook(render, {
        ...options,
        wrapper: ({ children }: { children: ReactNode }) => React.createElement(React.Fragment, null, children)
    })
}

export const mockSupabaseClient = {
    auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } })
    },
    from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null })
    })),
    channel: jest.fn(() => ({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn()
    }))
}

export const mockConsoleError = () => {
    const originalError = console.error
    beforeAll(() => {
        console.error = jest.fn()
    })
    afterAll(() => {
        console.error = originalError
    })
}

export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0))

export const advanceTimersByTime = (ms: number) => {
    jest.advanceTimersByTime(ms)
}

// Add test data generators
export const generateMockBoardCell = (overrides = {}) => ({
    text: 'Test cell',
    colors: [],
    completedBy: [],
    blocked: false,
    isMarked: false,
    cellId: 'test-cell-1',
    ...overrides
})

export const generateMockPlayer = (overrides = {}) => ({
    id: 'player-1',
    name: 'Test Player',
    color: 'bg-blue-500',
    hoverColor: 'hover:bg-blue-600',
    team: 0,
    ...overrides
})

export const generateMockTag = (overrides = {}) => ({
    id: 'tag-1',
    name: 'Test Tag',
    type: 'core',
    category: {
        id: 'cat-1',
        name: 'difficulty',
        isRequired: true,
        allowMultiple: false,
        validForGames: ['all']
    },
    status: 'active',
    description: 'Test description',
    createdAt: new Date(),
    updatedAt: new Date(),
    usageCount: 0,
    votes: 0,
    ...overrides
})
