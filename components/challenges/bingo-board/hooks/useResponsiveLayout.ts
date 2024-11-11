import { useState, useEffect } from 'react'
import { BREAKPOINTS, type Breakpoint } from './useResponsive'

export interface FluidTypography {
  fontSize: string
  lineHeight: string
  letterSpacing: string
}

export interface ResponsiveSpacing {
  padding: string
  margin: string
  gap: string
}

export function useResponsiveLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Calculate fluid typography based on viewport width
  const getFluidTypography = (
    minSize: number,
    maxSize: number,
    minWidth = BREAKPOINTS.sm,
    maxWidth = BREAKPOINTS.xl
  ): FluidTypography => {
    const minSizeRem = minSize / 16
    const maxSizeRem = maxSize / 16
    const slope = (maxSizeRem - minSizeRem) / (maxWidth - minWidth)
    const yAxisIntersection = -minWidth * slope + minSizeRem

    return {
      fontSize: `clamp(${minSizeRem}rem, ${yAxisIntersection.toFixed(4)}rem + ${(slope * 100).toFixed(4)}vw, ${maxSizeRem}rem)`,
      lineHeight: '1.5',
      letterSpacing: '-0.01em'
    }
  }

  // Get responsive spacing values
  const getResponsiveSpacing = (base: number): ResponsiveSpacing => ({
    padding: `clamp(${base * 0.5}px, ${base * 0.75}vw, ${base}px)`,
    margin: `clamp(${base * 0.25}px, ${base * 0.5}vw, ${base}px)`,
    gap: `clamp(${base * 0.25}px, ${base * 0.5}vw, ${base}px)`
  })

  // Get grid layout properties based on screen size
  const getGridLayout = (size: number, isMobile: boolean) => {
    const minCellSize = isMobile ? 60 : 80
    const gap = isMobile ? 4 : 8
    
    return {
      gridTemplateColumns: `repeat(${size}, minmax(${minCellSize}px, 1fr))`,
      gap: `${gap}px`,
      padding: isMobile ? '0.5rem' : '1rem'
    }
  }

  // Get container width constraints
  const getContainerWidth = (breakpoint: Breakpoint) => {
    switch (breakpoint) {
      case 'sm': return 'calc(100vw - 2rem)'
      case 'md': return `${BREAKPOINTS.md - 48}px`
      case 'lg': return `${BREAKPOINTS.lg - 64}px`
      case 'xl': return `${BREAKPOINTS.xl - 96}px`
      case '2xl': return `${BREAKPOINTS['2xl'] - 128}px`
    }
  }

  // Add new function for cell typography
  const getCellTypography = (breakpoint: Breakpoint): FluidTypography => {
    switch (breakpoint) {
      case '2xl':
        return getFluidTypography(16, 20) // Largest screens
      case 'xl':
        return getFluidTypography(15, 18) // Desktop
      case 'lg':
        return getFluidTypography(14, 16) // Small desktop
      case 'md':
        return getFluidTypography(13, 15) // Tablet
      case 'sm':
      default:
        return getFluidTypography(12, 14) // Mobile
    }
  }

  // Handle resize events
  useEffect(() => {
    const handleResize = () => {
      setIsCollapsed(window.innerWidth < BREAKPOINTS.lg)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return {
    isCollapsed,
    getFluidTypography,
    getResponsiveSpacing,
    getGridLayout,
    getContainerWidth,
    getCellTypography,
  }
}

// Utility functions for consistent spacing
export const getResponsivePadding = (base: number) => ({
  mobile: Math.max(base * 0.5, 8),
  tablet: Math.max(base * 0.75, 12),
  desktop: base
})

export const getResponsiveGap = (base: number) => ({
  xs: Math.max(base * 0.25, 4),
  sm: Math.max(base * 0.5, 8),
  md: base,
  lg: base * 1.5,
  xl: base * 2
})

// Constants for consistent touch targets
export const TOUCH_TARGETS = {
  min: 44, // Minimum touch target size
  icon: 32, // Icon button size
  button: 40, // Regular button height
  input: 40, // Input field height
} as const

// Constants for text sizes
export const TEXT_SIZES = {
  xs: { min: 11, max: 12 },
  sm: { min: 12, max: 14 },
  base: { min: 14, max: 16 },
  lg: { min: 16, max: 18 },
  xl: { min: 18, max: 20 },
  '2xl': { min: 20, max: 24 },
  '3xl': { min: 24, max: 30 },
} as const 