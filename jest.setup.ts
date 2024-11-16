import '@testing-library/jest-dom'
import { configure } from '@testing-library/react'

configure({
  testIdAttribute: 'data-testid',
})

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
  return setTimeout(() => callback(Date.now()), 0)
})

global.cancelAnimationFrame = jest.fn((id: number) => {
  clearTimeout(id)
})

Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => '123e4567-e89b-12d3-a456-426614174000'
  }
})
