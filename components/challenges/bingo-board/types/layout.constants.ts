export const LAYOUT_CONSTANTS = {
  // Breakpoints
  BREAKPOINTS: {
    mobile: 0,
    tablet: 768,
    desktop: 1024
  },

  // Spacing
  SPACING: {
    base: 16,
    scale: 1.5,
    mobile: {
      vertical: 12,
      horizontal: 12
    },
    desktop: {
      vertical: 16,
      horizontal: 16
    }
  },

  // Typography
  TYPOGRAPHY: {
    base: 16,
    scale: 1.2,
    lineHeight: 1.5,
    mobile: {
      scale: 1.1
    }
  },

  // Grid
  GRID: {
    gap: {
      mobile: 8,
      desktop: 16
    },
    padding: {
      mobile: 16,
      tablet: 32,
      desktop: 64
    }
  },

  // Container
  CONTAINER: {
    maxWidth: 1280,
    padding: {
      mobile: 16,
      tablet: 32,
      desktop: 64
    }
  },

  // Transitions
  TRANSITIONS: {
    duration: '0.3s',
    timing: 'ease-in-out'
  },

  // Performance
  PERFORMANCE: {
    debounceDelay: 150,
    maxTickHistory: 100
  },

  // Storage Keys
  STORAGE: {
    layoutState: 'layoutState'
  },

  // Event Names
  EVENTS: {
    layoutChange: 'layoutChange'
  }
} as const

// Typen für die Konstanten
export type Breakpoint = keyof typeof LAYOUT_CONSTANTS.BREAKPOINTS
export type GridGap = keyof typeof LAYOUT_CONSTANTS.GRID.gap
export type ContainerPadding = keyof typeof LAYOUT_CONSTANTS.CONTAINER.padding 