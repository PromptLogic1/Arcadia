import '@testing-library/jest-dom'
import type { IncomingMessage, ServerResponse } from 'http'
const { TextEncoder, TextDecoder } = require('util')
const { createServer } = require('http')
const nodeFetch = require('node-fetch')
import { EventEmitter } from 'events';

// Define proper types for global objects
declare global {
  // Extend the existing global interface instead of redeclaring
  interface Global {
    TextEncoder: typeof TextEncoder
    TextDecoder: typeof TextDecoder
  }
}

// Set up global objects with proper typing
Object.defineProperty(global, 'TextEncoder', {
  value: TextEncoder,
  writable: true
})

Object.defineProperty(global, 'TextDecoder', {
  value: TextDecoder,
  writable: true
})

// Use type assertion for fetch to avoid duplicate declaration
;(global as any).fetch = nodeFetch

// Mock für window.matchMedia
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

// Mock für IntersectionObserver
const mockIntersectionObserver = jest.fn()
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
})
window.IntersectionObserver = mockIntersectionObserver

// Mock für ResizeObserver
window.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Verbesserter Supabase Mock mit korrekter Typisierung und Methodenverkettung
const createMockSupabaseClient = () => {
  const createQueryBuilder = () => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: null, error: null })
    }),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ 
      data: {
        id: 'test-session-id',
        board_id: 'test-board-id',
        status: 'active',
        current_state: [],
        winner_id: null,
        players: [],
        version: 1,
        last_update: new Date().toISOString()
      }, 
      error: null 
    })
  });

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ 
        data: { user: { id: 'test-user' } }, 
        error: null 
      })
    },
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis()
    })),
    removeChannel: jest.fn(),
    from: jest.fn(() => createQueryBuilder())
  };
};

export const mockSupabaseClient = createMockSupabaseClient()

// Mock für Supabase Client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}))

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn(() => mockSupabaseClient)
}))

// Fügen Sie diese Hilfsfunktion hinzu
global.fail = (message: string) => {
  throw new Error(message)
}

// Next.js Router Mock
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn()
  })),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  usePathname: jest.fn()
}))

// Server für API-Tests
let server: ReturnType<typeof createServer>
let testPort = 3001

// Before creating the server
EventEmitter.defaultMaxListeners = 20;

beforeAll(() => {
  server = createServer((req: IncomingMessage, res: ServerResponse) => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: true }))
  })

  return new Promise<void>((resolve) => {
    server.listen(testPort, () => resolve());
  });
})

afterAll(() => {
  return new Promise<void>((resolve) => {
    server?.close(() => resolve());
  });
})

// Exportiere den Port für Tests
export { testPort }