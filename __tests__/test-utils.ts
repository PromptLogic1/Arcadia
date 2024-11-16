import { renderHook } from '@testing-library/react'
import type { RenderHookOptions } from '@testing-library/react'
import type { ReactNode } from 'react'
import { Fragment, createElement } from 'react'
import type { Player } from '@/components/challenges/bingo-board/types/types'

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

// Add test data generators
export const generateMockBoardCell = (overrides = {}) => ({
    cellId: 'test-cell',
    text: 'Test Cell',
    colors: [],
    completedBy: [],
    blocked: false,
    isMarked: false,
    ...overrides
})

export const generateMockPlayer = (overrides = {}): Player => ({
    id: 'test-player',
    name: 'Test Player',
    color: 'bg-blue-500',
    hoverColor: 'hover:bg-blue-600',
    team: 0,
    ...overrides
})

// Rest of the file remains the same... 