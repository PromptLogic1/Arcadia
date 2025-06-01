/**
 * Constants for BingoBoardEdit component
 */

// UI Layout constants
export const BOARD_EDIT_LAYOUT = {
  SIDEBAR_WIDTH: {
    MAX: '310px',
    MIN: '310px',
  },
  GRID_CARD: {
    HEIGHT: '180px',
    WIDTH: '180px',
    GAP: '2',
  },
  GRID_SPACING: 196, // pixels per grid item including gap
} as const;

// Animation and timing
export const ANIMATIONS = {
  SAVE_SUCCESS_TIMEOUT: 3000,
  DEBOUNCE_DELAY: 300,
} as const;

// UI Messages
export const UI_MESSAGES = {
  AUTH: {
    LOGIN_REQUIRED: 'Please log in to view and edit Bingo Boards',
    LOADING: 'Loading...',
  },
  CARDS: {
    NO_PUBLIC_CARDS: 'No public cards available for this game',
    CARD_CREATION_PLACEHOLDER: 'Click Me for Card Creation',
  },
  SAVE: {
    SUCCESS: 'Changes saved successfully!',
    SAVING: 'Saving...',
  },
} as const;

// Tab configuration
export const TABS = {
  TEMPLATES: 'templates',
  PRIVATE: 'private',
  PUBLIC: 'public',
  GENERATOR: 'generator',
} as const;

// Form field character limits
export const FORM_LIMITS = {
  TITLE_MAX_LENGTH: 50,
  DESCRIPTION_MAX_LENGTH: 255,
  TAGS_MAX_COUNT: 5,
} as const;

// Component styling constants
export const STYLES = {
  TAB_TRIGGER_CLASSES: [
    'transition-all duration-200',
    'data-[state=active]:bg-cyan-500/20',
    'data-[state=active]:text-cyan-400',
    'data-[state=active]:border-b-2',
    'data-[state=active]:border-cyan-500',
    'hover:text-cyan-400',
    'p-0',
  ],
  GRADIENT_BUTTON: 'bg-gradient-to-r from-cyan-500 to-fuchsia-500',
  GRADIENT_TITLE: 'bg-gradient-to-r from-cyan-400 to-fuchsia-500',
} as const;
