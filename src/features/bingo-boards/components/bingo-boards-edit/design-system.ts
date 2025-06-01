/**
 * Unified Design System for Bingo Board Components
 * 
 * This file centralizes all design tokens, styles, and UI constants
 * to ensure visual consistency across all bingo board components.
 */

import { cva, type VariantProps } from 'class-variance-authority';

// =============================================================================
// COLOR PALETTE
// =============================================================================

export const colors = {
  // Primary brand colors
  primary: {
    cyan: 'cyan-500',
    purple: 'purple-500',
    fuchsia: 'fuchsia-500',
  },
  
  // Semantic colors
  semantic: {
    success: 'green-500',
    warning: 'yellow-500',
    error: 'red-500',
    info: 'blue-500',
  },
  
  // Difficulty colors (matching database enum)
  difficulty: {
    beginner: 'green-400',
    easy: 'green-500',
    medium: 'yellow-500',
    hard: 'orange-500',
    expert: 'red-500',
  },
  
  // Background layers
  background: {
    card: 'bg-gray-800/50 backdrop-blur-sm',
    cardHover: 'bg-gray-800/70',
    panel: 'bg-gray-900/30 backdrop-blur-sm',
    overlay: 'bg-gray-900/50 backdrop-blur-sm',
    interactive: 'bg-gray-800/30',
  },
  
  // Border colors
  border: {
    default: 'border-gray-700/50',
    hover: 'border-cyan-500/50',
    active: 'border-cyan-500',
    focus: 'border-purple-500',
    error: 'border-red-500/50',
  },
} as const;

// =============================================================================
// SPACING & LAYOUT
// =============================================================================

export const spacing = {
  // Component spacing
  cardGap: 'gap-3',
  sectionGap: 'gap-6',
  
  // Padding scales
  padding: {
    xs: 'p-2',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  },
  
  // Margins
  margin: {
    xs: 'm-2',
    sm: 'm-3',
    md: 'm-4',
    lg: 'm-6',
  },
} as const;

export const layout = {
  // Sidebar dimensions
  sidebar: {
    width: 'w-80', // 320px
    minWidth: 'min-w-[320px]',
    maxWidth: 'max-w-[320px]',
  },
  
  // Grid dimensions
  grid: {
    cardSize: 'w-44 h-44', // 176px × 176px
    gap: 'gap-3',
    maxWidth: 'max-w-4xl',
  },
  
  // Responsive breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const typography = {
  // Headings
  heading: {
    h1: 'text-2xl font-bold',
    h2: 'text-xl font-semibold',
    h3: 'text-lg font-medium',
    h4: 'text-base font-medium',
  },
  
  // Body text
  body: {
    large: 'text-base',
    normal: 'text-sm',
    small: 'text-xs',
  },
  
  // Special text
  label: 'text-xs font-medium uppercase tracking-wider',
  caption: 'text-xs text-gray-400',
  mono: 'font-mono text-xs',
} as const;

// =============================================================================
// ANIMATIONS
// =============================================================================

export const animations = {
  // Transitions
  transition: {
    default: 'transition-all duration-200',
    fast: 'transition-all duration-150',
    slow: 'transition-all duration-300',
  },
  
  // Transform animations
  transform: {
    scaleHover: 'hover:scale-[1.02]',
    scaleDrag: 'active:scale-95',
    rotate180: 'rotate-180',
  },
  
  // Specific animations
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
  fadeIn: 'animate-in fade-in',
  fadeOut: 'animate-out fade-out',
} as const;

// =============================================================================
// COMPONENT VARIANTS
// =============================================================================

// Card variants
export const cardVariants = cva(
  [
    'rounded-lg border backdrop-blur-sm',
    'transition-all duration-200',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          colors.background.card,
          colors.border.default,
          'hover:' + colors.border.hover,
        ].join(' '),
        ghost: [
          'bg-transparent',
          'border-transparent',
          'hover:' + colors.background.interactive,
        ].join(' '),
        interactive: [
          colors.background.interactive,
          colors.border.default,
          'hover:' + colors.background.cardHover,
          'hover:' + colors.border.hover,
          'cursor-pointer',
        ].join(' '),
        draggable: [
          colors.background.card,
          colors.border.default,
          'hover:' + colors.border.hover,
          'cursor-grab active:cursor-grabbing',
          'hover:shadow-lg',
        ].join(' '),
        droppable: [
          'border-2 border-dashed',
          colors.border.default,
          'hover:' + colors.border.hover,
          'data-[over=true]:' + colors.border.active,
          'data-[over=true]:bg-cyan-500/10',
        ].join(' '),
      },
      size: {
        sm: 'p-2',
        md: 'p-3',
        lg: 'p-4',
      },
      state: {
        default: '',
        dragging: 'opacity-50 scale-95',
        dragOver: 'border-purple-500 bg-purple-500/20 shadow-lg shadow-purple-500/20',
        disabled: 'opacity-50 cursor-not-allowed',
        empty: 'border-2 border-dashed border-gray-600/40 bg-gray-800/20',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      state: 'default',
    },
  }
);

// Button variants
export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center rounded-md font-medium',
    'transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: [
          'bg-gradient-to-r from-cyan-500 to-purple-500',
          'text-white',
          'hover:from-cyan-600 hover:to-purple-600',
          'shadow-lg shadow-cyan-500/20',
        ].join(' '),
        secondary: [
          colors.background.card,
          'border',
          colors.border.default,
          'text-cyan-300',
          'hover:' + colors.border.hover,
          'hover:' + colors.background.cardHover,
        ].join(' '),
        ghost: [
          'hover:' + colors.background.interactive,
          'text-gray-300',
          'hover:text-cyan-300',
        ].join(' '),
        danger: [
          'bg-red-500/20',
          'border border-red-500/50',
          'text-red-400',
          'hover:bg-red-500/30',
          'hover:border-red-500',
        ].join(' '),
      },
      size: {
        xs: 'h-7 px-2 text-xs',
        sm: 'h-8 px-3 text-sm',
        md: 'h-9 px-4 text-sm',
        lg: 'h-10 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'md',
    },
  }
);

// Badge variants
export const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-gray-700/50 text-gray-300',
        primary: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
        success: 'bg-green-500/20 text-green-300 border border-green-500/30',
        warning: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
        danger: 'bg-red-500/20 text-red-300 border border-red-500/30',
      },
      size: {
        sm: 'px-1.5 py-0.5 text-[10px]',
        md: 'px-2 py-0.5 text-xs',
        lg: 'px-2.5 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get difficulty badge styles
 */
export function getDifficultyStyles(difficulty: string) {
  const difficultyMap = {
    beginner: 'bg-green-500/20 text-green-300 border-green-500/30',
    easy: 'bg-green-500/20 text-green-300 border-green-500/30',
    medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    hard: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    expert: 'bg-red-500/20 text-red-300 border-red-500/30',
  };
  
  return difficultyMap[difficulty as keyof typeof difficultyMap] || difficultyMap.medium;
}

/**
 * Get gradient text styles
 */
export function getGradientText(variant: 'primary' | 'secondary' = 'primary') {
  const gradients = {
    primary: 'bg-gradient-to-r from-cyan-400 to-purple-500',
    secondary: 'bg-gradient-to-r from-purple-400 to-fuchsia-500',
  };
  
  return `${gradients[variant]} bg-clip-text text-transparent`;
}

// =============================================================================
// COMPONENT STYLES
// =============================================================================

export const componentStyles = {
  // Tab styles
  tab: {
    list: 'w-full border border-cyan-500/20 bg-gray-800/50 backdrop-blur-sm',
    trigger: [
      'transition-all duration-200',
      'data-[state=active]:bg-cyan-500/20',
      'data-[state=active]:text-cyan-300',
      'data-[state=active]:border-b-2',
      'data-[state=active]:border-cyan-500',
      'hover:text-cyan-300',
    ].join(' '),
    content: 'mt-4',
  },
  
  // Dialog styles
  dialog: {
    overlay: 'bg-black/80 backdrop-blur-sm',
    content: [
      colors.background.panel,
      'border',
      colors.border.default,
      'shadow-xl shadow-cyan-500/10',
    ].join(' '),
  },
  
  // Input styles
  input: {
    base: [
      'w-full rounded-md',
      colors.background.interactive,
      'border',
      colors.border.default,
      'text-gray-100',
      'placeholder:text-gray-500',
      'focus:' + colors.border.active,
      'focus:ring-2 focus:ring-cyan-500/20',
      'transition-colors duration-200',
    ].join(' '),
  },
  
  // Grid cell styles
  gridCell: {
    empty: 'border-2 border-dashed border-gray-600/40 bg-gray-800/20 hover:border-gray-500/60 hover:bg-gray-800/40',
    template: 'border border-blue-400/30 bg-gradient-to-br from-blue-900/20 to-blue-800/10',
    custom: 'border border-cyan-500/30 bg-gradient-to-br from-cyan-900/20 to-cyan-800/10',
  },
} as const;

// =============================================================================
// EXPORTS
// =============================================================================

export type CardVariants = VariantProps<typeof cardVariants>;
export type ButtonVariants = VariantProps<typeof buttonVariants>;
export type BadgeVariants = VariantProps<typeof badgeVariants>;