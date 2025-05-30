// 🧱 UI Constants and Configuration for SignUpForm Components

// 🎨 Form Configuration
export const SIGNUP_FORM_CONFIG = {
  DEFAULT_REDIRECT_PATH: '/user/user-page',
  DEFAULT_REDIRECT_DELAY: 3,
  PASSWORD_REQUIREMENTS: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: true,
  },
  PERSISTENCE: {
    ENABLED: true,
    MAX_AGE_DAYS: 7,
  },
  OAUTH: {
    ENABLED: true,
    SUPPORTED_PROVIDERS: ['google'] as const,
  },
} as const;

// 🎨 UI Messages
export const SIGNUP_MESSAGES = {
  HEADERS: {
    DEFAULT_TITLE: 'Create your account',
    DEFAULT_SUBTITLE: 'Join our community and start your journey',
  },
  FORM: {
    PROCESSING: 'Processing...',
    SUBMIT_BUTTON: 'Sign Up',
    VALIDATION_ERROR: 'Please fix the errors below',
    SUCCESS: 'Account created successfully!',
    EMAIL_VERIFICATION: 'Please check your email to verify your account',
  },
  OAUTH: {
    CONTINUE_WITH: 'Or continue with',
    GOOGLE_BUTTON: 'Continue with Google',
    REDIRECTING: (provider: string) => `Redirecting to ${provider}...`,
    ERROR: (provider: string) => `Failed to sign up with ${provider}`,
    UNSUPPORTED: (provider: string) => `${provider} OAuth is not yet supported`,
  },
  FOOTER: {
    HAVE_ACCOUNT: 'Already have an account?',
    SIGN_IN_LINK: 'Sign in',
  },
  FIELD_LABELS: {
    USERNAME: 'Account Name',
    USERNAME_HELP: 'Choose a unique identifier for your account',
    USERNAME_PLACEHOLDER: 'This will not be your shown username',
    EMAIL: 'Email address',
    EMAIL_PLACEHOLDER: 'Enter your email',
    PASSWORD: 'Password',
    PASSWORD_PLACEHOLDER: 'Create a password',
    CONFIRM_PASSWORD: 'Confirm Password',
    CONFIRM_PASSWORD_PLACEHOLDER: 'Confirm your password',
  },
} as const;

// 🎨 Styling Constants
export const SIGNUP_STYLES = {
  CONTAINER: 'w-full max-w-md space-y-8',
  HEADER: {
    CONTAINER: 'text-center space-y-2',
    TITLE_BASE:
      'text-3xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-transparent',
    SUBTITLE_BASE: 'text-gray-400',
  },
  FORM: {
    CONTAINER: 'space-y-6',
    SUBMIT_BUTTON_BASE:
      'w-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 rounded-full py-2 font-medium text-white transition-all duration-200 hover:opacity-90 shadow-lg shadow-cyan-500/25',
    SUBMIT_BUTTON_DISABLED: 'cursor-not-allowed opacity-50',
  },
  OAUTH: {
    DIVIDER: {
      CONTAINER: 'relative',
      LINE: 'absolute inset-0 flex items-center',
      LINE_BORDER: 'w-full border-t border-gray-700',
      TEXT_CONTAINER: 'relative flex justify-center text-sm',
      TEXT: 'bg-gray-900 px-2 text-gray-400',
    },
    BUTTON: 'flex w-full items-center justify-center gap-2',
  },
  FOOTER: {
    CONTAINER: 'text-center text-sm text-gray-400',
    LINK: 'text-cyan-400 transition-colors duration-200 hover:text-fuchsia-400',
  },
  SIZE_VARIANTS: {
    SM: {
      TITLE: 'text-2xl',
      SUBTITLE: 'text-sm',
    },
    LG: {
      TITLE: 'text-4xl',
      SUBTITLE: 'text-base',
    },
  },
} as const;

// 🎨 Animation Constants
export const SIGNUP_ANIMATIONS = {
  TRANSITIONS: {
    DEFAULT: 'transition-all duration-200',
    COLORS: 'transition-colors duration-200',
  },
  TIMER: {
    REDIRECT_INTERVAL: 1000,
  },
} as const;

// 🎨 Validation Constants
export const VALIDATION_CONSTANTS = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
    ALLOWED_PATTERN: /^[a-zA-Z0-9_-]+$/,
    RESERVED_NAMES: [
      'admin',
      'administrator',
      'root',
      'system',
      'null',
      'undefined',
    ],
  },
  EMAIL: {
    MAX_LENGTH: 254,
    PATTERN:
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  },
  PASSWORD: {
    COMMON_PATTERNS: [
      /^(.)\1+$/, // All same character
      /^(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i,
    ],
  },
} as const;

// 🎨 Error Messages
export const ERROR_MESSAGES = {
  FORM: {
    GENERAL: 'An error occurred during sign up',
    NETWORK: 'Network error. Please check your connection and try again.',
    VALIDATION: 'Please correct the errors and try again.',
  },
  OAUTH: {
    FAILED: 'OAuth signup failed',
    DESCRIPTION: 'Please try again or contact support if the problem persists.',
  },
} as const;

// 🎨 Log Messages
export const LOG_MESSAGES = {
  FORM: {
    FIELD_CHANGED: 'Form field changed',
    SIGNUP_START: 'Starting user signup process',
    SIGNUP_SUCCESS: 'User signup completed successfully',
    SIGNUP_FAILED: 'Signup process failed',
  },
  OAUTH: {
    START: 'Starting OAuth signup process',
    SUCCESS: 'OAuth signup completed successfully',
    FAILED: 'OAuth signup failed',
  },
  PERSISTENCE: {
    LOADED: 'Loaded saved form data',
  },
} as const;

// 🎨 Component Display Names
export const COMPONENT_NAMES = {
  SIGNUP_FORM: 'SignUpForm',
  SIGNUP_FORM_HEADER: 'SignUpFormHeader',
  SIGNUP_FORM_FIELDS: 'SignUpFormFields',
  SIGNUP_OAUTH_SECTION: 'SignUpOAuthSection',
  SIGNUP_FORM_FOOTER: 'SignUpFormFooter',
  LOGIN_FORM: 'LoginForm',
  LOGIN_FORM_HEADER: 'LoginFormHeader',
  LOGIN_FORM_FIELDS: 'LoginFormFields',
  LOGIN_OAUTH_SECTION: 'LoginOAuthSection',
  LOGIN_FORM_FOOTER: 'LoginFormFooter',
} as const;

// 🔑 LOGIN FORM CONSTANTS
export const LOGIN_FORM_CONFIG = {
  VALIDATION: {
    EMAIL_REQUIRED: 'Email is required',
    EMAIL_INVALID: 'Please enter a valid email address',
    PASSWORD_REQUIRED: 'Password is required',
  },
  PERSISTENCE: {
    EMAIL_KEY: 'loginEmail',
    REMEMBER_ME_KEY: 'rememberMe',
  },
  OAUTH: {
    SUPPORTED_PROVIDERS: ['google'] as const,
    PROVIDER_CONFIGS: {
      google: {
        label: 'Continue with Google',
        icon: 'Mail',
      },
    },
  },
  REDIRECTS: {
    SUCCESS_PATH: '/',
    FORGOT_PASSWORD_PATH: '/auth/forgot-password',
    SIGNUP_PATH: '/auth/signup',
    REDIRECT_DELAY: 1000,
  },
} as const;

export const LOGIN_MESSAGES = {
  HEADERS: {
    TITLE: 'Welcome back',
    SUBTITLE: 'Sign in to your account',
  },
  FORM: {
    EMAIL_LABEL: 'Email address',
    EMAIL_PLACEHOLDER: 'Enter your email',
    PASSWORD_LABEL: 'Password',
    PASSWORD_PLACEHOLDER: 'Enter your password',
    SUBMIT_BUTTON: 'Sign In',
    PROCESSING: 'Signing in...',
    FORGOT_PASSWORD: 'Forgot password?',
    SIGNUP_PROMPT: "Don't have an account?",
    SIGNUP_LINK: 'Sign up',
  },
  OAUTH: {
    CONTINUE_WITH: 'Or continue with',
    GOOGLE_BUTTON: 'Continue with Google',
    REDIRECTING: 'Redirecting to Google...',
  },
  SUCCESS: {
    WELCOME_BACK: 'Welcome back! Redirecting...',
    VERIFICATION_NEEDED: 'Please check your email to verify your account',
  },
  ERRORS: {
    LOGIN_FAILED: 'Login failed',
    OAUTH_FAILED: 'Google login failed',
    UNEXPECTED_ERROR: 'An unexpected error occurred',
    TRY_AGAIN: 'Please try again',
  },
  LOADING: {
    CHECKING_AUTH: 'Checking authentication...',
  },
} as const;

export const LOGIN_STYLES = {
  CONTAINER: 'w-full max-w-md space-y-6',
  HEADER: {
    CONTAINER: 'text-center space-y-2',
    TITLE_BASE:
      'text-3xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-transparent',
    SUBTITLE_BASE: 'text-sm text-gray-400',
  },
  FORM: {
    CONTAINER: 'space-y-6',
    SUBMIT_BUTTON_BASE:
      'w-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 rounded-full py-2 font-medium text-white transition-all duration-200 hover:opacity-90 shadow-lg shadow-cyan-500/25',
    SUBMIT_BUTTON_DISABLED: 'disabled:cursor-not-allowed disabled:opacity-50',
    FORGOT_PASSWORD_CONTAINER: 'text-center',
    FORGOT_PASSWORD_LINK:
      'text-sm text-cyan-400 transition-colors duration-200 hover:text-fuchsia-400',
  },
  OAUTH: {
    DIVIDER: {
      CONTAINER: 'relative',
      LINE: 'absolute inset-0 flex items-center',
      LINE_BORDER: 'w-full border-t border-gray-700',
      TEXT_CONTAINER: 'relative flex justify-center text-sm',
      TEXT: 'bg-gray-900 px-2 text-gray-400',
    },
    BUTTON: 'flex w-full items-center justify-center gap-2',
    BUTTONS_CONTAINER: 'space-y-4',
  },
  FOOTER: {
    CONTAINER: 'text-center text-sm text-gray-400',
    SIGNUP_LINK:
      'text-cyan-400 transition-colors duration-200 hover:text-fuchsia-400',
  },
} as const;
