'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { debounce } from '../utils/layout.utils'
import { LAYOUT_CONSTANTS, type Breakpoint } from '../types/layout.constants'
import { log } from '@/lib/logger'

// Add export to FluidTypography interface
export interface FluidTypography {
  fontSize: string
  lineHeight: string
  base: number
  scale: number
}

// Layout States
interface LayoutState {
  breakpoint: 'mobile' | 'tablet' | 'desktop'
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
}

// Layout Properties
interface LayoutProperties {
  grid: {
    columns: number
    gap: number
    padding: number
  }
  spacing: {
    base: number
    vertical: number
    horizontal: number
    gap: number
  }
  typography: FluidTypography
  container: {
    maxWidth: number
    padding: number
  }
}

// Layout Events
interface LayoutChangeEvent {
  breakpoint: LayoutState['breakpoint']
  dimensions: {
    width: number
    height: number
  }
  timestamp: number
}

declare global {
  interface WindowEventMap {
    'layoutChange': CustomEvent<LayoutChangeEvent>
  }
}

interface UseLayout {
  // Layout States
  breakpoint: LayoutState['breakpoint']
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isCollapsed: boolean

  // Layout Berechnungen
  getGridLayout: (size: number, isMobile: boolean) => LayoutProperties['grid']
  getResponsiveSpacing: (base: number) => LayoutProperties['spacing']
  getFluidTypography: (min: number, max: number) => LayoutProperties['typography']
  getContainerWidth: () => LayoutProperties['container']

  // Responsive Anpassungen
  handleResize: () => void
  updateBreakpoint: () => void
  adjustLayout: () => void
  preventLayoutShift: () => void

  // Layout Events
  handleLayoutTransition: () => void
}

interface CachedLayout {
  grid: LayoutProperties['grid']
  spacing: LayoutProperties['spacing']
  typography: LayoutProperties['typography']
  container: LayoutProperties['container']
}

export const useLayout = (): UseLayout => {
  // Layout States
  const [layoutState, setLayoutState] = useState<LayoutState>({
    breakpoint: 'desktop',
    isMobile: false,
    isTablet: false,
    isDesktop: true
  })

  // Cache für Layout-Berechnungen
  const layoutCache = useMemo(() => new Map<string, CachedLayout[keyof CachedLayout]>(), [])

  // Layout Berechnungen mit Konstanten
  const getGridLayout = useCallback((size: number, isMobile: boolean): LayoutProperties['grid'] => {
    const cacheKey = `grid-${size}-${isMobile}`
    const cached = layoutCache.get(cacheKey)
    if (cached && isGridLayout(cached)) return cached

    const layout = {
      columns: size,
      gap: isMobile ? LAYOUT_CONSTANTS.GRID.GAP_SM : LAYOUT_CONSTANTS.GRID.GAP_LG,
      padding: LAYOUT_CONSTANTS.GRID.CONTAINER_PADDING
    }

    layoutCache.set(cacheKey, layout)
    return layout
  }, [layoutCache])

  const getResponsiveSpacing = useCallback((base: number): LayoutProperties['spacing'] => {
    const cacheKey = `spacing-${base}`
    const cached = layoutCache.get(cacheKey)
    if (cached && isSpacingLayout(cached)) return cached

    const spacing = {
      base,
      vertical: layoutState.isMobile 
        ? LAYOUT_CONSTANTS.SPACING.SM 
        : LAYOUT_CONSTANTS.SPACING.LG,
      horizontal: layoutState.isMobile 
        ? LAYOUT_CONSTANTS.SPACING.SM 
        : LAYOUT_CONSTANTS.SPACING.LG,
      gap: layoutState.isMobile 
        ? LAYOUT_CONSTANTS.SPACING.XS 
        : LAYOUT_CONSTANTS.SPACING.MD
    }

    layoutCache.set(cacheKey, spacing)
    return spacing
  }, [layoutState.isMobile, layoutCache])

  const getFluidTypography = useCallback((min: number, max: number): LayoutProperties['typography'] => {
    const cacheKey = `typography-${min}-${max}`
    const cached = layoutCache.get(cacheKey)
    if (cached && isTypographyLayout(cached)) return cached

    // Calculate fluid font size
    const minWidth = LAYOUT_CONSTANTS.BREAKPOINTS.mobile
    const maxWidth = LAYOUT_CONSTANTS.BREAKPOINTS.desktop
    const slope = (max - min) / (maxWidth - minWidth)
    const yAxisIntersection = min - slope * minWidth

    const typography: FluidTypography = {
      fontSize: `clamp(${min}px, ${yAxisIntersection}px + ${slope * 100}vw, ${max}px)`,
      lineHeight: '1.5',
      base: layoutState.isMobile ? min : max,
      scale: (max - min) / 2
    }

    layoutCache.set(cacheKey, typography)
    return typography
  }, [layoutState.isMobile, layoutCache])

  const getContainerWidth = useCallback((): LayoutProperties['container'] => {
    const cacheKey = 'container'
    const cached = layoutCache.get(cacheKey)
    if (cached && isContainerLayout(cached)) return cached

    const container = {
      maxWidth: LAYOUT_CONSTANTS.CONTAINER.maxWidth,
      padding: LAYOUT_CONSTANTS.CONTAINER.padding[layoutState.breakpoint]
    }

    layoutCache.set(cacheKey, container)
    return container
  }, [layoutState.breakpoint, layoutCache])

  // Typ-Guards für Cache-Validierung
  const isGridLayout = (value: unknown): value is LayoutProperties['grid'] => {
    return value !== null &&
           typeof value === 'object' &&
           'columns' in value &&
           'gap' in value &&
           'padding' in value
  }

  const isSpacingLayout = (value: unknown): value is LayoutProperties['spacing'] => {
    return value !== null &&
           typeof value === 'object' &&
           'base' in value &&
           'vertical' in value &&
           'horizontal' in value &&
           'gap' in value
  }

  const isTypographyLayout = (value: unknown): value is LayoutProperties['typography'] => {
    return value !== null &&
           typeof value === 'object' &&
           'base' in value &&
           'scale' in value &&
           'lineHeight' in value &&
           'fluid' in value
  }

  const isContainerLayout = (value: unknown): value is LayoutProperties['container'] => {
    return value !== null &&
           typeof value === 'object' &&
           'maxWidth' in value &&
           'padding' in value
  }

  // Responsive Anpassungen
  const preventLayoutShift = useCallback(() => {
    document.documentElement.style.setProperty(
      '--vh', 
      `${window.innerHeight * 0.01}px`
    )
  }, [])

  // Layout Transitions mit Konstanten
  const handleLayoutTransition = useCallback(() => {
    document.documentElement.style.setProperty('--layout-transition', 'none')
    requestAnimationFrame(() => {
      document.documentElement.style.setProperty(
        '--layout-transition',
        `all ${LAYOUT_CONSTANTS.TRANSITIONS.duration} ${LAYOUT_CONSTANTS.TRANSITIONS.timing}`
      )
    })
  }, [])

  // Event Emission mit Konstanten
  const emitLayoutChange = useCallback((breakpoint: Breakpoint) => {
    try {
      const event = new CustomEvent(LAYOUT_CONSTANTS.EVENTS.layoutChange, {
        detail: {
          breakpoint,
          dimensions: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          timestamp: Date.now()
        },
        bubbles: true
      })
      window.dispatchEvent(event)
    } catch (error) {
      log.error('Error emitting layout change', error, { metadata: { hook: 'useLayout' } })
    }
  }, [])

  // Erweiterte Breakpoint Erkennung
  const updateBreakpoint = useCallback(() => {
    const width = window.innerWidth

    const newBreakpoint = 
      width < LAYOUT_CONSTANTS.BREAKPOINTS.tablet ? 'mobile' :
      width < LAYOUT_CONSTANTS.BREAKPOINTS.desktop ? 'tablet' : 
      'desktop'

    setLayoutState(_prev => ({
      breakpoint: newBreakpoint,
      isMobile: newBreakpoint === 'mobile',
      isTablet: newBreakpoint === 'tablet',
      isDesktop: newBreakpoint === 'desktop'
    }))

    // Layout Event emittieren
    emitLayoutChange(newBreakpoint)
  }, [emitLayoutChange])

  // Erweiterte Layout Anpassungen
  const adjustLayout = useCallback(() => {
    layoutCache.clear()
    handleLayoutTransition()
    preventLayoutShift()
  }, [layoutCache, handleLayoutTransition, preventLayoutShift])

  const handleResize = useCallback(() => {
    updateBreakpoint()
    adjustLayout()
  }, [updateBreakpoint, adjustLayout])

  // Resize Handler mit Konstanten
  const debouncedResize = useMemo(
    () => debounce(handleResize, LAYOUT_CONSTANTS.PERFORMANCE.debounceDelay),
    [handleResize]
  )

  // Event Listener
  useEffect(() => {
    updateBreakpoint()
    window.addEventListener('resize', debouncedResize)
    
    return () => {
      window.removeEventListener('resize', debouncedResize)
      layoutCache.clear()
    }
  }, [updateBreakpoint, debouncedResize, layoutCache])

  return {
    // States
    breakpoint: layoutState.breakpoint,
    isMobile: layoutState.isMobile,
    isTablet: layoutState.isTablet,
    isDesktop: layoutState.isDesktop,
    isCollapsed: false,

    // Berechnungen
    getGridLayout,
    getResponsiveSpacing,
    getFluidTypography,
    getContainerWidth,

    // Anpassungen
    handleResize,
    updateBreakpoint,
    adjustLayout,
    preventLayoutShift,

    // Layout Events
    handleLayoutTransition
  }
}