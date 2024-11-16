import { renderHook } from '@testing-library/react'
import type { RenderHookOptions } from '@testing-library/react'
import type { ReactElement } from 'react'

export function renderHookWithProviders<Result, Props>(
    render: (props: Props) => Result,
    options?: Omit<RenderHookOptions<Props>, 'wrapper'>
) {
    return renderHook(render, {
        ...options,
        wrapper: ({ children }: { children: ReactElement }) => children
    })
}

// Add more test utilities here
