export const LAYOUT_CONSTANTS = {
  // Breakpoints (mobile-first approach)
  BREAKPOINTS: {
    SM: 640,   // Small devices (landscape phones)
    MD: 768,   // Medium devices (tablets)
    LG: 1024,  // Large devices (laptops)
    XL: 1280,  // Extra large devices (desktops)
    '2XL': 1536, // 2X Extra large devices (large desktops)
    // Legacy names for compatibility with useLayout
    mobile: 640,   // Same as SM
    tablet: 768,   // Same as MD
    desktop: 1024, // Same as LG
  },

  // Container Settings
  CONTAINER: {
    maxWidth: 1280, // XL breakpoint
    padding: {
      mobile: 16,
      tablet: 24,
      desktop: 32,
    },
  },

  // Transitions
  TRANSITIONS: {
    duration: '200ms',
    timing: 'ease-in-out',
  },

  // Events
  EVENTS: {
    layoutChange: 'layoutChange',
  },

  // Performance Settings
  PERFORMANCE: {
    debounceDelay: 150,
  },

  // Grid System
  GRID: {
    COLUMNS: 12,
    GAP_SM: 4,
    GAP_MD: 6,
    GAP_LG: 8,
    CONTAINER_PADDING: 16,
  },

  // Component Sizing
  SIZING: {
    HEADER_HEIGHT: 64,
    SIDEBAR_WIDTH: 280,
    SIDEBAR_COLLAPSED_WIDTH: 80,
    FOOTER_HEIGHT: 48,
    CARD_MIN_HEIGHT: 120,
  },

  // Animation Durations
  ANIMATION: {
    FAST: 150,
    NORMAL: 200,
    SLOW: 300,
    VERY_SLOW: 500,
  },

  // Z-Index Layers
  Z_INDEX: {
    DROPDOWN: 1000,
    STICKY: 1020,
    FIXED: 1030,
    MODAL_BACKDROP: 1040,
    MODAL: 1050,
    POPOVER: 1060,
    TOOLTIP: 1070,
    TOAST: 1080,
  },

  // Spacing Scale (in px)
  SPACING: {
    XS: 4,
    SM: 8,
    MD: 16,
    LG: 24,
    XL: 32,
    '2XL': 48,
    '3XL': 64,
  }
} as const

// Breakpoint type for TypeScript
export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'mobile' | 'tablet' | 'desktop'

// Layout mode types
export type LayoutMode = 'desktop' | 'tablet' | 'mobile'

// Responsive value type
export type ResponsiveValue<T> = T | {
  sm?: T
  md?: T  
  lg?: T
  xl?: T
  '2xl'?: T
}

// Grid props type
export interface GridProps {
  columns?: ResponsiveValue<number>
  gap?: ResponsiveValue<number>
  padding?: ResponsiveValue<number>
}

// Layout utilities
export const LAYOUT_UTILS = {
  // Get current breakpoint based on window width
  getCurrentBreakpoint: (width: number): Breakpoint => {
    if (width >= LAYOUT_CONSTANTS.BREAKPOINTS['2XL']) return '2xl'
    if (width >= LAYOUT_CONSTANTS.BREAKPOINTS.XL) return 'xl'
    if (width >= LAYOUT_CONSTANTS.BREAKPOINTS.LG) return 'lg'
    if (width >= LAYOUT_CONSTANTS.BREAKPOINTS.MD) return 'md'
    return 'sm'
  },

  // Get layout mode from breakpoint
  getLayoutMode: (breakpoint: Breakpoint): LayoutMode => {
    if (breakpoint === 'sm') return 'mobile'
    if (breakpoint === 'md') return 'tablet'
    return 'desktop'
  },

  // Media query helpers
  mediaQuery: {
    sm: `(min-width: ${LAYOUT_CONSTANTS.BREAKPOINTS.SM}px)`,
    md: `(min-width: ${LAYOUT_CONSTANTS.BREAKPOINTS.MD}px)`,
    lg: `(min-width: ${LAYOUT_CONSTANTS.BREAKPOINTS.LG}px)`,
    xl: `(min-width: ${LAYOUT_CONSTANTS.BREAKPOINTS.XL}px)`,
    '2xl': `(min-width: ${LAYOUT_CONSTANTS.BREAKPOINTS['2XL']}px)`,
  }
} as const 