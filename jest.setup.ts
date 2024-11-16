import '@testing-library/jest-dom'
import { configure } from '@testing-library/react'
import { TextEncoder as NodeTextEncoder, TextDecoder as NodeTextDecoder } from 'util'
import './__tests__/mocks/env.mock'

// Configure testing library
configure({
  testIdAttribute: 'data-testid',
})

// Mock TextEncoder/TextDecoder with proper types
class MockTextEncoder extends NodeTextEncoder {
  encode(input?: string): Uint8Array {
    return super.encode(input)
  }
}

class MockTextDecoder extends NodeTextDecoder {
  decode(
    input?: ArrayBuffer | NodeJS.TypedArray | DataView | null | undefined,
    options?: { stream?: boolean }
  ): string {
    return super.decode(input, options)
  }
}

// Set global objects
Object.defineProperty(global, 'TextEncoder', { value: MockTextEncoder })
Object.defineProperty(global, 'TextDecoder', { value: MockTextDecoder })

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock requestAnimationFrame with proper return type
const originalRAF = global.requestAnimationFrame
global.requestAnimationFrame = function(callback: FrameRequestCallback): number {
  return originalRAF(callback) || 0
}

// Mock cancelAnimationFrame
global.cancelAnimationFrame = jest.fn((id: number) => {
  clearTimeout(id)
})

// Mock crypto
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => '123e4567-e89b-12d3-a456-426614174000',
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    }
  }
})

// Mock fetch
global.fetch = jest.fn()

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
  removeItem: jest.fn(),
  length: 0,
  key: jest.fn()
}
Object.defineProperty(global, 'localStorage', { value: localStorageMock })

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
  removeItem: jest.fn(),
  length: 0,
  key: jest.fn()
}
Object.defineProperty(global, 'sessionStorage', { value: sessionStorageMock })

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})
