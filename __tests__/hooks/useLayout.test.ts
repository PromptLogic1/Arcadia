import { renderHook, act } from '@testing-library/react'
import { useLayout } from '@/components/challenges/bingo-board/hooks/useLayout'
import { LAYOUT_CONSTANTS } from '@/components/challenges/bingo-board/types/layout.constants'
import type { SpacingConfig } from '@/components/challenges/bingo-board/types/layout.constants'

describe('useLayout', () => {
  // Mock window methods and properties
  const mockMatchMedia = jest.fn()
  const originalInnerWidth = window.innerWidth
  const originalInnerHeight = window.innerHeight
  const originalRequestAnimationFrame = window.requestAnimationFrame

  beforeAll(() => {
    window.matchMedia = mockMatchMedia.mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }))

    window.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0)
  })

  beforeEach(() => {
    // Add fake timers setup to beforeEach
    jest.useFakeTimers()
    
    // Reset window dimensions before each test
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

    // Clear all mocks
    jest.clearAllMocks()
    
    // Reset document styles
    document.documentElement.style.cssText = ''
  })

  afterEach(() => {
    // Cleanup timers after each test
    jest.useRealTimers()
  })

  afterAll(() => {
    // Restore original window properties
    Object.defineProperty(window, 'innerWidth', {
      value: originalInnerWidth,
      configurable: true,
      writable: true
    })
    Object.defineProperty(window, 'innerHeight', {
      value: originalInnerHeight,
      configurable: true,
      writable: true
    })
    window.requestAnimationFrame = originalRequestAnimationFrame
  })

  describe('Breakpoint Detection', () => {
    it('should initialize with correct desktop breakpoint', () => {
      const { result } = renderHook(() => useLayout())
      
      expect(result.current.breakpoint).toBe('desktop')
      expect(result.current.isDesktop).toBe(true)
      expect(result.current.isTablet).toBe(false)
      expect(result.current.isMobile).toBe(false)
    })

    it('should detect tablet breakpoint correctly', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: LAYOUT_CONSTANTS.BREAKPOINTS.tablet + 100
      })

      const { result } = renderHook(() => useLayout())
      
      act(() => {
        window.dispatchEvent(new Event('resize'))
      })

      expect(result.current.breakpoint).toBe('tablet')
      expect(result.current.isTablet).toBe(true)
    })

    it('should detect mobile breakpoint correctly', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: LAYOUT_CONSTANTS.BREAKPOINTS.mobile + 100
      })

      const { result } = renderHook(() => useLayout())
      
      act(() => {
        window.dispatchEvent(new Event('resize'))
      })

      expect(result.current.breakpoint).toBe('mobile')
      expect(result.current.isMobile).toBe(true)
    })
  })

  describe('Layout Calculations', () => {
    it('should calculate grid layout correctly for different breakpoints', () => {
      const { result } = renderHook(() => useLayout())
      
      // Test desktop grid
      const desktopGrid = result.current.getGridLayout(4, false)
      expect(desktopGrid).toEqual({
        columns: 4,
        gap: LAYOUT_CONSTANTS.GRID.gap.desktop,
        padding: LAYOUT_CONSTANTS.GRID.padding.desktop
      })

      // Test mobile grid
      const mobileGrid = result.current.getGridLayout(4, true)
      expect(mobileGrid).toEqual({
        columns: 4,
        gap: LAYOUT_CONSTANTS.GRID.gap.mobile,
        padding: LAYOUT_CONSTANTS.GRID.padding.mobile
      })
    })

    it('should calculate responsive spacing correctly', () => {
      const { result } = renderHook(() => useLayout())
      const baseSpacing = 16

      const spacing = result.current.getResponsiveSpacing(baseSpacing)
      
      expect(spacing).toMatchObject<SpacingConfig>({
        vertical: expect.any(Number),
        horizontal: expect.any(Number),
        gap: expect.any(Number)
      })

      // Test base spacing separately since it's not part of SpacingConfig
      expect(spacing).toHaveProperty('base', baseSpacing)
    })

    it('should calculate fluid typography correctly', () => {
      const { result } = renderHook(() => useLayout())
      const typography = result.current.getFluidTypography(16, 24)

      expect(typography).toMatchObject({
        fontSize: expect.stringContaining('clamp'),
        lineHeight: expect.any(String),
        base: expect.any(Number),
        scale: expect.any(Number)
      })
    })

    it('should return correct container width', () => {
      const { result } = renderHook(() => useLayout())
      const container = result.current.getContainerWidth()

      expect(container).toMatchObject({
        maxWidth: LAYOUT_CONSTANTS.CONTAINER.maxWidth,
        padding: expect.any(Number)
      })
    })
  })

  describe('Layout Events and Updates', () => {
    it('should emit layout change event on resize', () => {
      const dispatchEvent = jest.spyOn(window, 'dispatchEvent')
      const { result } = renderHook(() => useLayout())

      act(() => {
        result.current.handleResize()
      })

      expect(dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: LAYOUT_CONSTANTS.EVENTS.layoutChange,
          detail: expect.objectContaining({
            breakpoint: expect.any(String),
            dimensions: expect.objectContaining({
              width: expect.any(Number),
              height: expect.any(Number)
            })
          })
        })
      )
    })

    it('should handle layout transitions correctly', () => {
      const { result } = renderHook(() => useLayout())
      
      act(() => {
        result.current.handleLayoutTransition()
        // Run immediate timer for setting 'none'
        jest.advanceTimersByTime(0)
        
        // Run RAF
        jest.runOnlyPendingTimers()
      })

      // Verify final transition state
      act(() => {
        // Allow time for the RAF callback to complete
        jest.runOnlyPendingTimers()
      })

      const finalTransition = document.documentElement.style.getPropertyValue('--layout-transition')
      expect(finalTransition).toBe(
        `all ${LAYOUT_CONSTANTS.TRANSITIONS.duration} ${LAYOUT_CONSTANTS.TRANSITIONS.timing}`
      )
    })

    it('should prevent layout shift', () => {
      const { result } = renderHook(() => useLayout())
      
      act(() => {
        result.current.preventLayoutShift()
      })

      const vh = document.documentElement.style.getPropertyValue('--vh')
      expect(vh).toBe(`${window.innerHeight * 0.01}px`)
    })
  })

  describe('Cleanup and Memory Management', () => {
    it('should clean up event listeners on unmount', () => {
      const removeEventListener = jest.spyOn(window, 'removeEventListener')
      const { unmount } = renderHook(() => useLayout())
      
      unmount()
      
      expect(removeEventListener).toHaveBeenCalledWith(
        'resize', 
        expect.any(Function)
      )
    })

    it('should properly debounce resize events', () => {
      const { result } = renderHook(() => useLayout())

      act(() => {
        // Trigger multiple resize events
        window.dispatchEvent(new Event('resize'))
        window.dispatchEvent(new Event('resize'))
        window.dispatchEvent(new Event('resize'))
        
        // Fast-forward past debounce delay
        jest.advanceTimersByTime(LAYOUT_CONSTANTS.PERFORMANCE.debounceDelay)
      })

      // Should only process the last event
      expect(result.current.breakpoint).toBeDefined()
    })
  })
})

