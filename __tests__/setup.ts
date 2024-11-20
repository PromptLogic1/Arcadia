import '@testing-library/jest-dom'
import { configure } from '@testing-library/react'

// Configure testing-library
configure({
  testIdAttribute: 'data-testid',
})

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = (callback: FrameRequestCallback): number => {
  return setTimeout(() => callback(Date.now()), 0) as unknown as number
}

global.cancelAnimationFrame = (id: number): void => {
  clearTimeout(id)
}

// Mock window.crypto
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => '123e4567-e89b-12d3-a456-426614174000'
  }
}) 