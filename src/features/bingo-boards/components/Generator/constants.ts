// Generator Panel Constants
export const GENERATOR_UI_CONFIG = {
  MIN_VOTES_DEFAULT: 0,
  MIN_VOTES_MIN: 0,
  GRID_CARD_SIZE: {
    HEIGHT: 180,
    WIDTH: 180,
  },
  DEBOUNCE_DELAY: 300,
} as const;

// Form Field Labels and Placeholders
export const GENERATOR_LABELS = {
  CARD_CATEGORIES: 'Card Categories',
  USE_ALL_CATEGORIES: 'Use All Categories',
  SELECT_CATEGORY: 'Select category',
  DIFFICULTY: 'Difficulty',
  SELECT_DIFFICULTY: 'Select difficulty',
  POOL_SIZE: 'Pool Size',
  SELECT_POOL_SIZE: 'Select pool size',
  MINIMUM_VOTES: 'Minimum Votes',
  CARD_SOURCES: 'Card Sources',
  USE_PRIVATE_CARDS: 'Use Private Cards',
  USE_PUBLIC_CARDS: 'Use Public Cards',
  GENERATE_BUTTON: 'Generate Board',
  GENERATING: 'Generating...',
} as const;

// Error Messages
export const GENERATOR_ERRORS = {
  NO_CARDS_AVAILABLE: 'No cards found with current settings',
  NOT_ENOUGH_CARDS: 'Not enough cards available',
  GENERATION_FAILED: 'Failed to generate board',
  CHOOSE_CATEGORY: 'Choose a category',
  SPECIFY_PRODUCT: 'Specify your product',
  NO_SUCH_PRODUCT: 'There is no such product',
} as const;

// Error Tips
export const ERROR_TIPS = [
  'Try selecting different categories',
  'Adjust difficulty settings',
  'Include both public and private cards',
  'Reduce minimum votes requirement',
] as const;

// Enhanced Styling Classes - Leveraging Tailwind v4 Features
export const GENERATOR_STYLES = {
  // Cards with enhanced glass effects and responsive containers
  CARD: 'glass card-responsive border-border/30 bg-card/40 backdrop-blur-md',
  CARD_INTENSE: 'glass-intense border-border/20 bg-card/60',

  // Typography with text shadows and better hierarchy
  TITLE: 'text-lg font-semibold text-primary text-glow',
  SUBTITLE: 'text-sm font-medium text-muted-foreground',
  LABEL: 'text-sm font-medium text-foreground/90',

  // Form Elements with touch optimization and user validation
  SELECT_TRIGGER:
    'touch-target border-border/30 bg-input/80 hover:bg-input/90 focus:ring-ring user-invalid:border-destructive user-valid:border-green-500',
  SELECT_CONTENT: 'glass border-border/30 bg-popover backdrop-blur-sm',
  SELECT_ITEM:
    'touch-target hover:bg-accent/20 focus:bg-accent/20 pointer-coarse:p-3 pointer-fine:p-2',

  // Interactive elements with enhanced effects
  BADGE:
    'border border-border/30 bg-accent/10 text-accent text-shadow-sm hover-lift',
  BADGE_SELECTED:
    'border-accent/50 bg-accent/20 text-accent text-shadow-md drop-shadow-sm drop-shadow-accent/30',

  // Buttons with modern gradients and effects
  BUTTON_PRIMARY:
    'w-full gradient-primary hover-glow text-primary-foreground font-medium touch-target text-shadow-sm drop-shadow-lg drop-shadow-primary/25',
  BUTTON_SECONDARY:
    'touch-target border-border/30 bg-secondary/80 hover:bg-secondary/90 text-secondary-foreground hover-lift',
  BUTTON_GHOST: 'touch-target hover:bg-accent/10 hover:text-accent hover-glow',

  // Enhanced error states with better visual feedback
  ERROR_CONTAINER:
    'mt-4 glass border border-destructive/30 bg-destructive/5 backdrop-blur-sm p-4 text-shadow-sm',
  ERROR_TEXT: 'text-destructive text-shadow-sm',
  ERROR_ICON: 'text-destructive drop-shadow-sm drop-shadow-destructive/30',

  // Loading states with modern animations
  LOADING_OVERLAY: 'glass-intense safe-center animate-fade',
  LOADING_SPINNER:
    'animate-glow text-primary drop-shadow-lg drop-shadow-primary/50',
} as const;

// Enhanced Animation Classes with v4 features
export const ANIMATION_CLASSES = {
  // Entry animations
  FADE_IN: 'animate-fade',
  SLIDE_DOWN: 'animate-slide-down',
  SCALE_IN: 'animate-scale-in',

  // Attention animations
  PULSE: 'animate-pulse',
  GLOW: 'animate-glow',
  FLOAT: 'animate-float',

  // Interaction animations
  HOVER_LIFT: 'hover-lift',
  HOVER_GLOW: 'hover-glow',

  // Loading animations
  LOADING_SPIN: 'animate-spin',
  LOADING_BOUNCE: 'animate-bounce',
} as const;

// Enhanced Component Spacing with container queries
export const SPACING = {
  // Responsive spacing that adapts to container size
  SECTION: 'space-y-4 @sm:space-y-6',
  FORM_GROUP: 'space-y-2 @sm:space-y-3',
  FLEX_GAP: 'gap-2 @sm:gap-3',

  // Touch-optimized spacing
  BADGE_GAP: 'mt-2 flex flex-wrap gap-2 pointer-coarse:gap-3',
  BUTTON_GAP: 'gap-2 pointer-coarse:gap-3',

  // Container-aware layouts
  GRID_RESPONSIVE: 'card-content-responsive',
  LIST_SPACING: 'space-y-2 @sm:space-y-3 @lg:space-y-4',
} as const;

// New v4-specific utilities
export const V4_UTILITIES = {
  // Text shadow variants
  TEXT_GLOW: 'text-glow',
  TEXT_NEON: 'text-neon',
  TEXT_HERO: 'text-hero',

  // Masking effects
  MASK_FADE_BOTTOM: 'mask-fade-bottom',
  MASK_FADE_EDGES: 'mask-fade-edges',

  // Safe alignment
  SAFE_CENTER: 'safe-center',

  // Touch optimization
  TOUCH_TARGET: 'touch-target',

  // Modern gradients
  GRADIENT_PRIMARY: 'gradient-primary',
  GRADIENT_RADIAL_GLOW: 'gradient-radial-glow',
} as const;

// Responsive breakpoints for container queries
export const CONTAINER_BREAKPOINTS = {
  SM: '@sm:', // ~320px
  MD: '@md:', // ~448px
  LG: '@lg:', // ~672px
  XL: '@xl:', // ~896px
} as const;
