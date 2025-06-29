import '@testing-library/jest-dom'; // adds every …toHave* matcher
import { toHaveNoViolations } from 'jest-axe';

// Extend Jest matchers for accessibility testing
expect.extend(toHaveNoViolations);

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    };
  },
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Mock Supabase client with complete API surface
interface MockSupabaseClient {
  auth: {
    getSession: jest.Mock;
    getUser: jest.Mock;
    signInWithPassword: jest.Mock;
    signInWithOAuth: jest.Mock;
    signUp: jest.Mock;
    signOut: jest.Mock;
    updateUser: jest.Mock;
    resetPasswordForEmail: jest.Mock;
    exchangeCodeForSession: jest.Mock;
    onAuthStateChange: jest.Mock;
  };
  from: jest.Mock;
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  eq: jest.Mock;
  single: jest.Mock;
  channel: jest.Mock;
}

const mockSupabaseClient: MockSupabaseClient = {
  auth: {
    getSession: jest
      .fn()
      .mockResolvedValue({ data: { session: null }, error: null }),
    getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signInWithPassword: jest.fn(),
    signInWithOAuth: jest.fn().mockResolvedValue({ data: null, error: null }),
    signUp: jest.fn(),
    signOut: jest.fn(),
    updateUser: jest.fn(),
    resetPasswordForEmail: jest.fn(), // Add missing method
    exchangeCodeForSession: jest.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
    onAuthStateChange: jest
      .fn()
      .mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
  },
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockResolvedValue('SUBSCRIBED'),
    unsubscribe: jest.fn(),
  })),
};

jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
  createServerComponentClient: jest.fn(() =>
    Promise.resolve(mockSupabaseClient)
  ),
  isSupabaseError: (error: unknown): boolean => {
    if (!error || typeof error !== 'object') {
      return false;
    }
    return (
      'message' in error &&
      typeof error.message === 'string' &&
      ('code' in error || 'status' in error || '__isAuthError' in error)
    );
  },
  isAuthError: (error: unknown): boolean => {
    if (!error || typeof error !== 'object') {
      return false;
    }
    return '__isAuthError' in error && error.__isAuthError === true;
  },
  SupabaseError: class SupabaseError extends Error {
    constructor(
      message: string,
      public code?: string,
      public details?: string
    ) {
      super(message);
      this.name = 'SupabaseError';
    }
  },
  handleSupabaseError: jest.fn(),
}));

// Extend global interface to include mockSupabaseClient
declare global {
  var mockSupabaseClient: MockSupabaseClient;
}

// Global test utilities
global.mockSupabaseClient = mockSupabaseClient;

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock IntersectionObserver
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];

  constructor() {}
  disconnect(): void {}
  observe(): void {}
  unobserve(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

global.IntersectionObserver = MockIntersectionObserver;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect(): void {}
  observe(): void {}
  unobserve(): void {}
};

// Mock localStorage and sessionStorage (only if window exists)
const mockStorage: Storage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: mockStorage,
  });

  Object.defineProperty(window, 'sessionStorage', {
    value: mockStorage,
  });
}

// Mock Web APIs that might not be available in Jest environment
global.Request = global.Request || class Request {};
// Create a proper Response mock if it doesn't exist
if (!global.Response) {
  class MockResponse {
    static json(data: unknown, options?: ResponseInit) {
      return new MockResponse(JSON.stringify(data), {
        ...options,
        headers: {
          'content-type': 'application/json',
          ...options?.headers,
        },
      } as ResponseInit);
    }

    constructor(
      public body?: BodyInit | null,
      public init?: ResponseInit
    ) {}
  }

  global.Response = MockResponse as unknown as typeof Response;
}
global.Headers = global.Headers || class Headers {};
global.fetch = global.fetch || jest.fn();

// Add TextEncoder/TextDecoder polyfills for Node.js environment
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = global.TextEncoder || TextEncoder;
global.TextDecoder = global.TextDecoder || TextDecoder;

// Mock crypto for UUID generation
global.crypto =
  global.crypto ||
  ({
    getRandomValues: jest.fn((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    randomUUID: jest.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
    subtle: {} as SubtleCrypto,
  } as unknown as Crypto);

// Mock Upstash Redis
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(-1),
    exists: jest.fn().mockResolvedValue(0),
    hget: jest.fn().mockResolvedValue(null),
    hset: jest.fn().mockResolvedValue(1),
    hdel: jest.fn().mockResolvedValue(1),
    hgetall: jest.fn().mockResolvedValue({}),
    lpush: jest.fn().mockResolvedValue(1),
    rpop: jest.fn().mockResolvedValue(null),
    llen: jest.fn().mockResolvedValue(0),
    eval: jest.fn().mockResolvedValue(1),
    multi: jest.fn().mockReturnValue({
      get: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      del: jest.fn().mockReturnThis(),
      incr: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    }),
  })),
}));

// Mock Upstash Ratelimit
const MockRatelimit = jest.fn().mockImplementation(() => ({
  limit: jest.fn().mockResolvedValue({
    success: true,
    limit: 10,
    remaining: 9,
    reset: Date.now() + 60000,
    pending: Promise.resolve(),
  }),
  blockUntilReady: jest.fn().mockResolvedValue(undefined),
  getRemaining: jest.fn().mockResolvedValue(9),
  reset: jest.fn().mockResolvedValue(undefined),
}));

// Add static methods to the constructor
interface MockRatelimitConstructor {
  new (): ReturnType<typeof MockRatelimit>;
  slidingWindow: jest.Mock;
  fixedWindow: jest.Mock;
  tokenBucket: jest.Mock;
}

(MockRatelimit as unknown as MockRatelimitConstructor).slidingWindow = jest
  .fn()
  .mockReturnValue('sliding-window-limiter');
(MockRatelimit as unknown as MockRatelimitConstructor).fixedWindow = jest
  .fn()
  .mockReturnValue('fixed-window-limiter');
(MockRatelimit as unknown as MockRatelimitConstructor).tokenBucket = jest
  .fn()
  .mockReturnValue('token-bucket-limiter');

jest.mock('@upstash/ratelimit', () => ({
  Ratelimit: MockRatelimit,
}));

// Mock uncrypto
jest.mock('uncrypto', () => ({
  getRandomValues: jest.fn((arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  }),
  randomUUID: jest.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
  subtle: {
    importKey: jest.fn(),
    sign: jest.fn(),
    verify: jest.fn(),
  },
}));

// Mock auth service
jest.mock('@/services/auth.service', () => ({
  authService: {
    getSession: jest.fn().mockResolvedValue({ success: true, data: null }),
    getCurrentUser: jest.fn().mockResolvedValue({ success: true, data: null }),
    signIn: jest.fn().mockResolvedValue({
      success: true,
      data: { user: null, session: null },
    }),
    signInWithEmail: jest.fn().mockResolvedValue({
      success: true,
      data: { user: null, session: null },
    }),
    signInWithOAuth: jest.fn().mockResolvedValue({ success: true, data: null }),
    signUp: jest
      .fn()
      .mockResolvedValue({ success: true, data: { needsVerification: false } }),
    signOut: jest.fn().mockResolvedValue({ success: true, data: null }),
    resetPassword: jest.fn().mockResolvedValue({ success: true, data: null }),
    updateUser: jest.fn().mockResolvedValue({ success: true, data: null }),
    updatePassword: jest.fn().mockResolvedValue({ success: true, data: null }),
    updateUserData: jest.fn().mockResolvedValue({ success: true, data: null }),
    getUserData: jest.fn().mockResolvedValue({ success: true, data: null }),
    exchangeCodeForSession: jest.fn().mockResolvedValue({ success: true, data: null }),
    refreshSession: jest.fn().mockResolvedValue({ success: true, data: null }),
    onAuthStateChange: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
  },
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => {
  const actual = jest.requireActual('lucide-react') as Record<string, unknown>;
  return {
    ...actual,
    // Mock all icon exports as simple components
    __esModule: true,
  };
});

// Mock Icons module
jest.mock('@/components/ui/Icons', () => {
  const React = jest.requireActual('react');

  interface MockIconProps {
    className?: string;
    'data-testid'?: string;
    [key: string]: unknown;
  }

  const MockIcon = ({ className, ...props }: MockIconProps) =>
    React.createElement('span', {
      className,
      'data-testid': props['data-testid'] || 'icon',
      ...props,
    });

  return {
    Sun: (props: MockIconProps) =>
      React.createElement(MockIcon, { ...props, 'data-testid': 'sun-icon' }),
    Moon: (props: MockIconProps) =>
      React.createElement(MockIcon, { ...props, 'data-testid': 'moon-icon' }),
    Monitor: (props: MockIconProps) =>
      React.createElement(MockIcon, {
        ...props,
        'data-testid': 'monitor-icon',
      }),
    Globe: (props: MockIconProps) =>
      React.createElement(MockIcon, { ...props, 'data-testid': 'globe-icon' }),
    Check: (props: MockIconProps) =>
      React.createElement(MockIcon, { ...props, 'data-testid': 'check-icon' }),
    X: (props: MockIconProps) =>
      React.createElement(MockIcon, { ...props, 'data-testid': 'x-icon' }),
    AlertCircle: (props: MockIconProps) =>
      React.createElement(MockIcon, {
        ...props,
        'data-testid': 'alert-circle-icon',
      }),
    AlertTriangle: (props: MockIconProps) =>
      React.createElement(MockIcon, {
        ...props,
        'data-testid': 'alert-triangle-icon',
      }),
    Info: (props: MockIconProps) =>
      React.createElement(MockIcon, { ...props, 'data-testid': 'info-icon' }),
    CheckCircle: (props: MockIconProps) =>
      React.createElement(MockIcon, {
        ...props,
        'data-testid': 'check-circle-icon',
      }),
    XCircle: (props: MockIconProps) =>
      React.createElement(MockIcon, {
        ...props,
        'data-testid': 'x-circle-icon',
      }),
    Loader2: (props: MockIconProps) =>
      React.createElement(MockIcon, {
        ...props,
        'data-testid': 'loader2-icon',
      }),
    Play: (props: MockIconProps) =>
      React.createElement(MockIcon, { ...props, 'data-testid': 'play-icon' }),
    Edit: (props: MockIconProps) =>
      React.createElement(MockIcon, { ...props, 'data-testid': 'edit-icon' }),
    Home: (props: MockIconProps) =>
      React.createElement(MockIcon, { ...props, 'data-testid': 'home-icon' }),
    RefreshCw: (props: MockIconProps) =>
      React.createElement(MockIcon, {
        ...props,
        'data-testid': 'refresh-cw-icon',
      }),
    ChevronRight: (props: MockIconProps) =>
      React.createElement(MockIcon, {
        ...props,
        'data-testid': 'chevron-right-icon',
      }),
    ChevronDown: (props: MockIconProps) =>
      React.createElement(MockIcon, {
        ...props,
        'data-testid': 'chevron-down-icon',
      }),
    Grid3x3: (props: MockIconProps) =>
      React.createElement(MockIcon, {
        ...props,
        'data-testid': 'grid3x3-icon',
      }),
    Users: (props: MockIconProps) =>
      React.createElement(MockIcon, { ...props, 'data-testid': 'users-icon' }),
    Trophy: (props: MockIconProps) =>
      React.createElement(MockIcon, { ...props, 'data-testid': 'trophy-icon' }),
    Gamepad2: (props: MockIconProps) =>
      React.createElement(MockIcon, {
        ...props,
        'data-testid': 'gamepad2-icon',
      }),
    Mail: (props: MockIconProps) =>
      React.createElement(MockIcon, { ...props, 'data-testid': 'mail-icon' }),
    Edit3: (props: MockIconProps) =>
      React.createElement(MockIcon, { ...props, 'data-testid': 'edit3-icon' }),
    Activity: (props: MockIconProps) =>
      React.createElement(MockIcon, {
        ...props,
        'data-testid': 'activity-icon',
      }),
  };
});

// Set up test timeout
jest.setTimeout(10000);
