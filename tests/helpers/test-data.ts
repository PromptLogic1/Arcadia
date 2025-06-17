/**
 * Test data constants for Playwright tests
 */

export const TEST_USERS = {
  valid: {
    email: 'test@example.com',
    password: 'Test123!@#',
    firstName: 'Test',
    lastName: 'User',
  },
  invalid: {
    email: 'invalid-email',
    password: '123', // Too short
  },
  blocked: {
    email: 'blocked@example.com',
    password: 'Blocked123!',
  },
} as const;

export const TEST_ROUTES = {
  public: [
    '/',
    '/about',
    '/auth/login',
    '/auth/signup',
  ],
  authenticated: [
    '/dashboard',
    '/profile',
    '/settings',
    '/play',
    '/community',
  ],
} as const;

export const TEST_VIEWPORTS = {
  mobile: { width: 375, height: 667, name: 'iPhone SE' },
  tablet: { width: 768, height: 1024, name: 'iPad' },
  desktop: { width: 1280, height: 720, name: 'Desktop' },
  wide: { width: 1920, height: 1080, name: 'Full HD' },
} as const;

export const BINGO_TEST_DATA = {
  board: {
    title: 'Test Bingo Board',
    description: 'This is a test bingo board for automated testing',
    isPublic: true,
    tags: ['test', 'automated'],
  },
  cards: [
    { text: 'Test Card 1', difficulty: 'easy' },
    { text: 'Test Card 2', difficulty: 'medium' },
    { text: 'Test Card 3', difficulty: 'hard' },
    { text: 'Test Card 4', difficulty: 'easy' },
    { text: 'Test Card 5', difficulty: 'medium' },
  ],
} as const;

export const COMMUNITY_TEST_DATA = {
  discussion: {
    title: 'Test Discussion Thread',
    content: 'This is a test discussion created by automated tests.',
    category: 'general',
  },
  comment: {
    content: 'This is a test comment on the discussion.',
  },
} as const;

export const ERROR_MESSAGES = {
  auth: {
    invalidCredentials: 'Invalid email or password',
    emailRequired: 'Email is required',
    passwordRequired: 'Password is required',
    passwordTooShort: 'Password must be at least 8 characters',
    emailInvalid: 'Please enter a valid email address',
  },
  form: {
    required: 'This field is required',
    tooShort: 'Too short',
    tooLong: 'Too long',
  },
  network: {
    timeout: 'Request timed out',
    offline: 'No internet connection',
    serverError: 'Something went wrong',
  },
} as const;

export const TIMEOUTS = {
  animation: 300,
  debounce: 500,
  navigation: 3000,
  api: 5000,
  longRunning: 10000,
} as const;

export const SELECTORS = {
  header: {
    logo: '[data-testid="header-logo"]',
    navigation: '[data-testid="header-nav"]',
    userMenu: '[data-testid="user-menu"]',
    themeToggle: '[data-testid="theme-toggle"]',
  },
  auth: {
    emailInput: 'input[name="email"]',
    passwordInput: 'input[name="password"]',
    submitButton: 'button[type="submit"]',
    errorMessage: '[role="alert"]',
  },
  common: {
    loading: '[data-testid="loading"]',
    error: '[data-testid="error"]',
    success: '[data-testid="success"]',
    modal: '[role="dialog"]',
    dropdown: '[role="listbox"]',
  },
  landing: {
    hero: '#main-content',
    skipLink: 'text=Skip to main content',
    startPlayingButton: 'button:has-text("Start Playing"), a:has-text("Start Playing")',
    joinCommunityButton: 'button:has-text("Join Community"), a:has-text("Community")',
    featuredChallenges: '[data-testid*="challenge"], .challenge-card',
    carousel: '.carousel, .slider, [class*="snap"], .swiper',
    faqSection: 'text=/FAQ|Frequently Asked Questions/',
    footer: 'footer, [role="contentinfo"]',
  },
} as const;

export const LANDING_PAGE_DATA = {
  expectedSections: [
    'Try Demo Game',
    'Featured',
    'Upcoming Events',
    'Partners',
    'FAQ'
  ],
  challengeNames: [
    'Speedrun Showdown',
    'Puzzle Master',
    'Co-op Quest'
  ],
  navigationItems: [
    'Home',
    'About',
    'Play',
    'Community',
    'Challenge'
  ],
  footerLinks: [
    'About',
    'Privacy',
    'Terms',
    'Contact',
    'Help',
    'Support'
  ],
  socialMediaPatterns: [
    'github.com',
    'twitter.com',
    'discord',
    'linkedin.com',
    'youtube.com'
  ]
} as const;

export const PERFORMANCE_THRESHOLDS = {
  lcp: 2500, // Largest Contentful Paint (ms)
  fid: 100,  // First Input Delay (ms)
  cls: 0.1,  // Cumulative Layout Shift
  fcp: 1800, // First Contentful Paint (ms)
  loadTime: 5000, // Total load time (ms)
  slowNetworkLoadTime: 8000, // Load time on slow 3G (ms)
  bundleSize: {
    js: 300 * 1024,  // 300KB compressed
    css: 50 * 1024,  // 50KB compressed
    images: 500 * 1024, // 500KB total initial images
  },
  memory: 50 * 1024 * 1024, // 50MB
  concurrentLoadTime: 10000, // 10s for multiple pages
} as const;