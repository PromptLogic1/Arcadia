import '@testing-library/jest-dom'
import type { IncomingMessage, ServerResponse } from 'http'
import { TextEncoder, TextDecoder } from 'util'
import { createServer } from 'http'
import nodeFetch from 'node-fetch'
import { EventEmitter } from 'events'
import { AddressInfo } from 'net'
import type { Server as HttpServer } from 'http'

// Define proper types for global objects
declare global {
  // Extend the existing global interface instead of redeclaring
  interface Global {
    TextEncoder: typeof TextEncoder
    TextDecoder: typeof TextDecoder
    fetch: typeof nodeFetch
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

// Use proper typing for fetch
Object.defineProperty(global, 'fetch', {
  value: nodeFetch,
  writable: true
})

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
  })

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
  }
}

export const mockSupabaseClient = createMockSupabaseClient()

// Mock für Supabase Client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}))

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn(() => mockSupabaseClient)
}))

// Add this helper function
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
let testServer: HttpServer
const testPort = 3001

// Increase timeout for all tests
jest.setTimeout(30000)

// Increase event emitter limit
EventEmitter.defaultMaxListeners = 20

beforeAll(async () => {
  // Create server with error handling
  testServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: true }))
  })

  testServer.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      // If port is in use, try to close existing connections
      testServer.close(() => {
        testServer.listen(testPort)
      })
    }
  })

  // Wait for server to be ready
  await new Promise<void>((resolve, reject) => {
    testServer.listen(testPort, () => {
      const address = testServer.address() as AddressInfo
      console.log(`Test server running on port ${address.port}`)
      resolve()
    })

    testServer.on('error', reject)
  })
})

afterAll(async () => {
  // Properly close server and cleanup
  await new Promise<void>((resolve) => {
    testServer.close(() => resolve())
  })
})

// Add test environment cleanup
afterEach(() => {
  jest.clearAllMocks()
})

// Export the port for tests
export { testPort }