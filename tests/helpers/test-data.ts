/**
 * Enhanced test data constants with proper typing
 */
import type {
  TestUser,
  LoginFormData,
  SignupFormData,
  ForgotPasswordFormData,
  ResetPasswordFormData,
} from '../auth/types/test-types';

// Properly typed test users
export const TYPED_TEST_USERS = {
  valid: {
    email: 'test@example.com',
    password: 'Test123!@#',
    full_name: 'Test User',
    username: 'testuser',
  } as const satisfies Partial<TestUser>,

  invalid: {
    email: 'invalid-email',
    password: '123', // Too short
  } as const,

  blocked: {
    email: 'blocked@example.com',
    password: 'Blocked123!',
  } as const,
} as const;

// Form data for testing
export const TEST_FORM_DATA = {
  login: {
    valid: {
      email: 'test@example.com',
      password: 'Test123!@#',
      rememberMe: true,
    } satisfies LoginFormData,

    invalid: {
      email: 'invalid-email',
      password: '123',
    } satisfies Partial<LoginFormData>,
  },

  signup: {
    valid: {
      email: 'newuser@example.com',
      username: 'newuser123',
      password: 'NewUser123!@#',
      confirmPassword: 'NewUser123!@#',
      firstName: 'New',
      lastName: 'User',
      acceptTerms: true,
    } satisfies SignupFormData,

    passwordMismatch: {
      email: 'user@example.com',
      username: 'testuser',
      password: 'Password123!',
      confirmPassword: 'Different123!',
      acceptTerms: true,
    } satisfies SignupFormData,
  },

  forgotPassword: {
    valid: {
      email: 'user@example.com',
    } satisfies ForgotPasswordFormData,

    invalid: {
      email: 'not-an-email',
    } satisfies ForgotPasswordFormData,
  },

  resetPassword: {
    valid: {
      password: 'NewPassword123!',
      confirmPassword: 'NewPassword123!',
      token: 'valid-reset-token',
    } satisfies ResetPasswordFormData,

    weakPassword: {
      password: 'weak',
      confirmPassword: 'weak',
      token: 'valid-reset-token',
    } satisfies ResetPasswordFormData,
  },
} as const;

// Auth-specific selectors with data-testid
export const AUTH_SELECTORS = {
  form: {
    loginForm: '[data-testid="login-form"]',
    signupForm: '[data-testid="signup-form"]',
    forgotPasswordForm: '[data-testid="forgot-password-form"]',
    resetPasswordForm: '[data-testid="reset-password-form"]',
  },

  inputs: {
    email: '[data-testid="auth-email-input"]',
    password: '[data-testid="auth-password-input"]',
    confirmPassword: '[data-testid="auth-confirm-password-input"]',
    username: '[data-testid="auth-username-input"]',
    firstName: '[data-testid="auth-firstname-input"]',
    lastName: '[data-testid="auth-lastname-input"]',
    rememberMe: '[data-testid="auth-remember-checkbox"]',
    acceptTerms: '[data-testid="auth-terms-checkbox"]',
  },

  buttons: {
    submit: '[data-testid="auth-submit-button"]',
    googleOAuth: '[data-testid="auth-google-button"]',
    githubOAuth: '[data-testid="auth-github-button"]',
    logout: '[data-testid="auth-logout-button"]',
  },

  links: {
    forgotPassword: '[data-testid="auth-forgot-password-link"]',
    signUp: '[data-testid="auth-signup-link"]',
    signIn: '[data-testid="auth-signin-link"]',
    resendEmail: '[data-testid="auth-resend-email-link"]',
  },

  messages: {
    error: '[data-testid="auth-error-message"]',
    success: '[data-testid="auth-success-message"]',
    fieldError: '[data-testid="field-error-message"]',
  },

  ui: {
    userMenu: '[data-testid="user-menu"]',
    userAvatar: '[data-testid="user-avatar"]',
    loadingSpinner: '[data-testid="auth-loading"]',
    passwordStrength: '[data-testid="password-strength-indicator"]',
  },
} as const;

// Password validation test cases
export const PASSWORD_TEST_CASES = [
  { password: 'short', error: 'Password must be at least 8 characters' },
  {
    password: 'nouppercase123!',
    error: 'Password must contain an uppercase letter',
  },
  {
    password: 'NOLOWERCASE123!',
    error: 'Password must contain a lowercase letter',
  },
  { password: 'NoNumbers!', error: 'Password must contain a number' },
  {
    password: 'NoSpecialChar123',
    error: 'Password must contain a special character',
  },
  { password: 'password123!', error: 'Password is too common' },
  { password: '12345678!Aa', error: 'Password is too common' },
] as const;

// Email validation test cases
export const EMAIL_TEST_CASES = [
  { email: 'plaintext', error: 'Please enter a valid email address' },
  { email: '@example.com', error: 'Please enter a valid email address' },
  { email: 'user@', error: 'Please enter a valid email address' },
  {
    email: 'user..name@example.com',
    error: 'Please enter a valid email address',
  },
  { email: 'user@example', error: 'Please enter a valid email address' },
  {
    email: 'user name@example.com',
    error: 'Please enter a valid email address',
  },
  { email: '', error: 'Email is required' },
] as const;

// Auth routes for testing
export const AUTH_ROUTES = {
  public: {
    login: '/auth/login',
    signup: '/auth/signup',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    verifyEmail: '/auth/verify-email',
  },

  protected: {
    dashboard: '/dashboard',
    profile: '/profile',
    settings: '/settings',
    account: '/account',
  },

  admin: {
    users: '/admin/users',
    settings: '/admin/settings',
    analytics: '/admin/analytics',
  },

  api: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    signup: '/api/auth/signup',
    refresh: '/api/auth/refresh',
    session: '/api/auth/session',
    forgotPassword: '/api/auth/forgot-password',
    resetPassword: '/api/auth/reset-password',
  },
} as const;

// Session timeout values (in milliseconds)
export const SESSION_TIMEOUTS = {
  accessToken: 15 * 60 * 1000, // 15 minutes
  refreshToken: 7 * 24 * 60 * 60 * 1000, // 7 days
  rememberMe: 30 * 24 * 60 * 60 * 1000, // 30 days
  idle: 30 * 60 * 1000, // 30 minutes idle timeout
  animation: 300, // CSS animation duration
  navigation: 2000, // Page navigation timeout
} as const;

// Rate limiting thresholds
export const RATE_LIMITS = {
  login: {
    attempts: 5,
    window: 15 * 60 * 1000, // 15 minutes
    blockDuration: 60 * 60 * 1000, // 1 hour
  },

  passwordReset: {
    attempts: 3,
    window: 60 * 60 * 1000, // 1 hour
    blockDuration: 24 * 60 * 60 * 1000, // 24 hours
  },

  signup: {
    attempts: 3,
    window: 60 * 60 * 1000, // 1 hour
    blockDuration: 24 * 60 * 60 * 1000, // 24 hours
  },
} as const;

// XSS test payloads
export const XSS_PAYLOADS = [
  '<script>window.xssTest = true;</script>',
  '<img src=x onerror="window.xssTest=true">',
  'javascript:window.xssTest=true',
  '<svg onload="window.xssTest=true">',
  '"><script>window.xssTest=true</script>',
  '</script><script>window.xssTest=true</script>',
] as const;

// SQL injection test payloads
export const SQL_INJECTION_PAYLOADS = [
  "admin'--",
  "' OR '1'='1",
  "'; DROP TABLE users; --",
  "1' UNION SELECT * FROM users--",
  "' OR 1=1--",
  "admin' AND '1'='1",
] as const;

// Complete timeout configuration for all test types
export const TIMEOUTS = {
  ...SESSION_TIMEOUTS,
  api: 5000, // API request timeout
  page: 10000, // Page load timeout
  element: 3000, // Element visibility timeout
  network: 30000, // Network request timeout
  retry: 1000, // Retry delay
} as const;

// Community-specific test data
export const COMMUNITY_TEST_DATA = {
  games: [
    'Pokemon',
    'Sonic',
    'Mario',
    'Zelda',
    'Metroid',
    'Kirby',
    'DK Country',
  ],
  challengeTypes: ['Bingo', 'Speedrun', 'Achievement Hunt', 'Puzzle', 'Co-op'],
  tags: [
    'strategy',
    'help',
    'tips',
    'speedrun',
    'glitch',
    'guide',
    'tournament',
    'casual',
  ],
  moderationActions: ['auto_flag', 'auto_remove', 'require_review', 'approve'],
} as const;

// Error messages for community features
export const ERROR_MESSAGES = {
  discussion: {
    titleRequired: 'Title is required',
    contentRequired: 'Content is required',
    gameRequired: 'Please select a specific game',
    contentTooLong: 'Content must be less than 5000 characters',
    createFailed: 'Failed to create discussion',
    deleteFailed: 'Failed to delete discussion',
  },
  comment: {
    contentRequired: 'Comment cannot be empty',
    contentTooLong: 'Comment must be less than 2000 characters',
    createFailed: 'Failed to create comment',
    flaggedForReview: 'Your comment has been flagged for review',
  },
  moderation: {
    noPermission: 'You do not have permission to comment',
    rateLimitExceeded: 'You have exceeded the rate limit',
    contentFlagged: 'Content has been flagged for moderation',
  },
} as const;

// Bingo-specific test data
export const BINGO_TEST_DATA = {
  board: {
    title: 'Test Bingo Board',
    description: 'A test board for automated testing',
    size: 5,
    gameType: 'valorant',
    difficulty: 'medium',
    tags: ['test', 'automated', 'e2e'],
    isPublic: true,
  },
  cards: [
    { text: 'Get a kill', category: 'elimination' },
    { text: 'Plant spike', category: 'objective' },
    { text: 'Defuse spike', category: 'objective' },
    { text: 'Win a round', category: 'victory' },
    { text: 'Use ultimate', category: 'ability' },
  ],
  session: {
    maxPlayers: 4,
    allowSpectators: true,
    autoStart: false,
    timeLimit: 3600,
  },
  patterns: ['line', 'diagonal', 'corners', 'full_house'],
} as const;

// Test routes for navigation
export const TEST_ROUTES = {
  home: '/',
  about: '/about',
  features: '/features',
  pricing: '/pricing',
  contact: '/contact',
  blog: '/blog',
  community: '/community',
  playArea: '/play-area',
  bingo: '/bingo',
  challenges: '/challenges',
  auth: {
    login: '/auth/login',
    signup: '/auth/signup',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
  },
  dashboard: '/dashboard',
  profile: '/profile',
  settings: '/settings',
} as const;

// Backwards compatibility exports for legacy test files
export const TEST_USERS = TYPED_TEST_USERS;
export const SELECTORS = AUTH_SELECTORS;
export const TEST_VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1920, height: 1080 },
} as const;
