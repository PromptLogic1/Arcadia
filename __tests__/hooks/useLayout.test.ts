import { renderHook, act } from '@testing-library/react'
import { useLayout } from '@/components/challenges/bingo-board/hooks/useLayout'
import { LAYOUT_CONSTANTS } from '@/components/challenges/bingo-board/types/layout.constants'

describe('useLayout', () => {
  const originalInnerWidth = window.innerWidth
  const originalInnerHeight = window.innerHeight

  beforeEach(() => {
    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: LAYOUT_CONSTANTS.BREAKPOINTS.desktop
    })

    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768
    })
  })

  afterEach(() => {
    // Restore original dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth
    })

    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight
    })
  })

  describe('breakpoint detection', () => {
    it('should detect mobile breakpoint', () => {
      window.innerWidth = LAYOUT_CONSTANTS.BREAKPOINTS.mobile + 100
      const { result } = renderHook(() => useLayout())

      act(() => {
        result.current.updateBreakpoint()
      })

      expect(result.current.isMobile).toBe(true)
      expect(result.current.isTablet).toBe(false)
      expect(result.current.isDesktop).toBe(false)
    })

    it('should detect tablet breakpoint', () => {
      window.innerWidth = LAYOUT_CONSTANTS.BREAKPOINTS.tablet + 100
      const { result } = renderHook(() => useLayout())

      act(() => {
        result.current.updateBreakpoint()
      })

      expect(result.current.isMobile).toBe(false)
      expect(result.current.isTablet).toBe(true)
      expect(result.current.isDesktop).toBe(false)
    })

    it('should detect desktop breakpoint', () => {
      window.innerWidth = LAYOUT_CONSTANTS.BREAKPOINTS.desktop + 100
      const { result } = renderHook(() => useLayout())

      act(() => {
        result.current.updateBreakpoint()
      })

      expect(result.current.isMobile).toBe(false)
      expect(result.current.isTablet).toBe(false)
      expect(result.current.isDesktop).toBe(true)
    })
  })

  describe('layout calculations', () => {
    it('should calculate grid layout correctly', () => {
      const { result } = renderHook(() => useLayout())
      const grid = result.current.getGridLayout(4, true)

      expect(grid).toEqual({
        columns: 4,
        gap: LAYOUT_CONSTANTS.GRID.gap.mobile,
        padding: LAYOUT_CONSTANTS.GRID.padding.mobile
      })
    })

    it('should calculate responsive spacing', () => {
      const { result } = renderHook(() => useLayout())
      const spacing = result.current.getResponsiveSpacing(LAYOUT_CONSTANTS.SPACING.base)

      expect(spacing).toEqual({
        base: LAYOUT_CONSTANTS.SPACING.base,
        vertical: result.current.isMobile 
          ? LAYOUT_CONSTANTS.SPACING.mobile.vertical 
          : LAYOUT_CONSTANTS.SPACING.desktop.vertical,
        horizontal: result.current.isMobile 
          ? LAYOUT_CONSTANTS.SPACING.mobile.horizontal 
          : LAYOUT_CONSTANTS.SPACING.desktop.horizontal
      })
    })

    it('should calculate fluid typography', () => {
      const { result } = renderHook(() => useLayout())
      const typography = result.current.getFluidTypography(
        LAYOUT_CONSTANTS.TYPOGRAPHY.base * LAYOUT_CONSTANTS.TYPOGRAPHY.mobile.scale,
        LAYOUT_CONSTANTS.TYPOGRAPHY.base * LAYOUT_CONSTANTS.TYPOGRAPHY.scale
      )

      expect(typography).toEqual({
        base: result.current.isMobile 
          ? LAYOUT_CONSTANTS.TYPOGRAPHY.base * LAYOUT_CONSTANTS.TYPOGRAPHY.mobile.scale
          : LAYOUT_CONSTANTS.TYPOGRAPHY.base * LAYOUT_CONSTANTS.TYPOGRAPHY.scale,
        scale: LAYOUT_CONSTANTS.TYPOGRAPHY.scale - LAYOUT_CONSTANTS.TYPOGRAPHY.mobile.scale,
        lineHeight: LAYOUT_CONSTANTS.TYPOGRAPHY.lineHeight
      })
    })

    it('should calculate container width', () => {
      const { result } = renderHook(() => useLayout())
      const container = result.current.getContainerWidth()

      expect(container).toEqual({
        maxWidth: LAYOUT_CONSTANTS.CONTAINER.maxWidth,
        padding: LAYOUT_CONSTANTS.CONTAINER.padding[result.current.breakpoint]
      })
    })
  })

  describe('layout caching', () => {
    it('should cache layout calculations', () => {
      const { result } = renderHook(() => useLayout())

      // First calculation
      const grid1 = result.current.getGridLayout(4, true)
      // Second calculation with same params
      const grid2 = result.current.getGridLayout(4, true)

      expect(grid1).toBe(grid2) // Should return cached value
    })

    it('should clear cache on layout adjustment', () => {
      const { result } = renderHook(() => useLayout())

      const grid1 = result.current.getGridLayout(4, true)
      
      act(() => {
        result.current.adjustLayout()
      })

      const grid2 = result.current.getGridLayout(4, true)
      expect(grid1).not.toBe(grid2) // Should calculate new value
    })
  })

  describe('layout transitions', () => {
    it('should handle layout transitions correctly', () => {
      const { result } = renderHook(() => useLayout())

      act(() => {
        result.current.handleLayoutTransition()
      })

      expect(document.documentElement.style.getPropertyValue('--layout-transition'))
        .toBe('none')

      act(() => {
        jest.runAllTimers()
      })

      expect(document.documentElement.style.getPropertyValue('--layout-transition'))
        .toBe(`all ${LAYOUT_CONSTANTS.TRANSITIONS.duration} ${LAYOUT_CONSTANTS.TRANSITIONS.timing}`)
    })
  })

  describe('resize handling', () => {
    it('should handle resize events', () => {
      const { result } = renderHook(() => useLayout())
      
      window.innerWidth = LAYOUT_CONSTANTS.BREAKPOINTS.mobile + 100
      
      act(() => {
        window.dispatchEvent(new Event('resize'))
      })

      act(() => {
        jest.advanceTimersByTime(LAYOUT_CONSTANTS.PERFORMANCE.debounceDelay)
      })

      expect(result.current.isMobile).toBe(true)
    })

    it('should debounce resize events', () => {
      const { result } = renderHook(() => useLayout())
      const updateSpy = jest.spyOn(result.current, 'updateBreakpoint')

      // Multiple resize events
      act(() => {
        window.dispatchEvent(new Event('resize'))
        window.dispatchEvent(new Event('resize'))
        window.dispatchEvent(new Event('resize'))
      })

      expect(updateSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('layout events', () => {
    beforeEach(() => {
      jest.spyOn(window, 'dispatchEvent')
    })

    it('should emit layout change event with correct event name', () => {
      const { result } = renderHook(() => useLayout())

      act(() => {
        result.current.updateBreakpoint()
      })

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: LAYOUT_CONSTANTS.EVENTS.layoutChange
        })
      )
    })

    it('should include correct dimensions in event', () => {
      const { result } = renderHook(() => useLayout())

      act(() => {
        window.innerWidth = LAYOUT_CONSTANTS.BREAKPOINTS.desktop
        window.innerHeight = 800
        result.current.updateBreakpoint()
      })

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            dimensions: {
              width: LAYOUT_CONSTANTS.BREAKPOINTS.desktop,
              height: 800
            }
          })
        })
      )
    })
  })

  describe('error handling', () => {
    it('should handle event emission errors gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      const { result } = renderHook(() => useLayout())

      window.dispatchEvent = jest.fn().mockImplementation(() => {
        throw new Error('Event dispatch error')
      })

      act(() => {
        result.current.updateBreakpoint()
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error emitting layout change:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })
  })
}) 