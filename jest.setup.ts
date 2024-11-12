import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'
import { createServer } from 'http'
import nodeFetch from 'node-fetch'

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

// Set up fetch
global.fetch = nodeFetch as unknown as typeof fetch

// Mock Supabase client
const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockReturnThis()
}

const mockSupabaseClient = {
  auth: {
    getUser: jest.fn().mockResolvedValue({ 
      data: { user: { id: 'test-user' } }, 
      error: null 
    })
  },
  channel: jest.fn(() => mockChannel),
  removeChannel: jest.fn(),
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null })
  }))
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}))

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn(() => mockSupabaseClient)
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

// Create mock server for API tests
const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ success: true }))
})

beforeAll(() => {
  server.listen(3000)
})

afterAll(() => {
  server.close()
}) 