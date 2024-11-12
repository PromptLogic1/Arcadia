import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// Define proper types for global objects
declare global {
  // eslint-disable-next-line no-var
  var TextEncoder: typeof globalThis.TextEncoder
  // eslint-disable-next-line no-var
  var TextDecoder: typeof globalThis.TextDecoder
}

// Set up global objects
Object.defineProperty(global, 'TextEncoder', {
  value: TextEncoder,
  writable: true
})

Object.defineProperty(global, 'TextDecoder', {
  value: TextDecoder,
  writable: true
})

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClientComponentClient: jest.fn()
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn()
  })),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  usePathname: jest.fn()
})) 