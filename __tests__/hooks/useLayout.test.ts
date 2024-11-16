import { renderHook, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useLayout } from '@/components/challenges/bingo-board/hooks/useLayout'
import { LAYOUT_CONSTANTS } from '@/components/challenges/bingo-board/types/layout.constants'

describe('useLayout', () => {
  const originalInnerWidth = window.innerWidth
  const originalInnerHeight = window.innerHeight

  beforeEach(() => {
    // Reset window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
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

  it('should initialize with correct breakpoint', () => {
    const { result } = renderHook(() => useLayout())
    expect(result.current.breakpoint).toBe('desktop')
    expect(result.current.isDesktop).toBe(true)
    expect(result.current.isTablet).toBe(false)
    expect(result.current.isMobile).toBe(false)
  })

  it('should update breakpoint on window resize', () => {
    const { result } = renderHook(() => useLayout())

    act(() => {
      // Simulate mobile width
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: LAYOUT_CONSTANTS.BREAKPOINTS.mobile + 100
      })
      window.dispatchEvent(new Event('resize'))
    })

    expect(result.current.breakpoint).toBe('mobile')
    expect(result.current.isMobile).toBe(true)
  })

  it('should calculate grid layout correctly', () => {
    const { result } = renderHook(() => useLayout())
    
    const mobileGrid = result.current.getGridLayout(4, true)
    expect(mobileGrid).toEqual({
      columns: 4,
      gap: LAYOUT_CONSTANTS.GRID.gap.mobile,
      padding: LAYOUT_CONSTANTS.GRID.padding.mobile
    })

    const desktopGrid = result.current.getGridLayout(4, false)
    expect(desktopGrid).toEqual({
      columns: 4,
      gap: LAYOUT_CONSTANTS.GRID.gap.desktop,
      padding: LAYOUT_CONSTANTS.GRID.padding.desktop
    })
  })

  it('should calculate responsive spacing correctly', () => {
    const { result } = renderHook(() => useLayout())
    
    const spacing = result.current.getResponsiveSpacing(16)
    expect(spacing).toHaveProperty('base', 16)
    expect(spacing).toHaveProperty('vertical')
    expect(spacing).toHaveProperty('horizontal')
    expect(spacing).toHaveProperty('gap')
  })

  it('should calculate fluid typography correctly', () => {
    const { result } = renderHook(() => useLayout())
    
    const typography = result.current.getFluidTypography(16, 24)
    expect(typography).toHaveProperty('fontSize')
    expect(typography).toHaveProperty('lineHeight')
    expect(typography).toHaveProperty('base')
    expect(typography).toHaveProperty('scale')
  })

  it('should calculate container width correctly', () => {
    const { result } = renderHook(() => useLayout())
    
    const container = result.current.getContainerWidth()
    expect(container).toEqual({
      maxWidth: LAYOUT_CONSTANTS.CONTAINER.maxWidth,
      padding: LAYOUT_CONSTANTS.CONTAINER.padding[result.current.breakpoint]
    })
  })

  it('should prevent layout shift', () => {
    const { result } = renderHook(() => useLayout())
    
    act(() => {
      result.current.preventLayoutShift()
    })

    const vh = document.documentElement.style.getPropertyValue('--vh')
    expect(vh).toBeDefined()
  })

  it('should handle layout transitions', () => {
    const { result } = renderHook(() => useLayout())
    
    act(() => {
      result.current.handleLayoutTransition()
    })

    const transition = document.documentElement.style.getPropertyValue('--layout-transition')
    expect(transition).toBeDefined()
  })

  it('should emit layout change events', () => {
    const mockDispatchEvent = jest.spyOn(window, 'dispatchEvent')
    const { result } = renderHook(() => useLayout())

    act(() => {
      result.current.handleResize()
    })

    expect(mockDispatchEvent).toHaveBeenCalled()
    const event = mockDispatchEvent.mock.calls[0]?.[0] as CustomEvent
    expect(event?.detail).toHaveProperty('breakpoint')
    expect(event?.detail).toHaveProperty('dimensions')
    expect(event?.detail).toHaveProperty('timestamp')
  })

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useLayout())
    const removeEventListener = jest.spyOn(window, 'removeEventListener')
    
    unmount()
    
    expect(removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
  })

  it('should handle tablet breakpoint correctly', () => {
    const { result } = renderHook(() => useLayout())

    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: LAYOUT_CONSTANTS.BREAKPOINTS.tablet + 100
      })
      window.dispatchEvent(new Event('resize'))
    })

    expect(result.current.breakpoint).toBe('tablet')
    expect(result.current.isTablet).toBe(true)
    expect(result.current.isMobile).toBe(false)
    expect(result.current.isDesktop).toBe(false)
  })

  it('should debounce resize events', () => {
    jest.useFakeTimers()
    const { result } = renderHook(() => useLayout())
    const mockHandleResize = jest.spyOn(result.current, 'handleResize')

    act(() => {
      // Trigger multiple resize events
      for (let i = 0; i < 5; i++) {
        window.dispatchEvent(new Event('resize'))
      }
    })

    expect(mockHandleResize).not.toHaveBeenCalled()

    act(() => {
      jest.runAllTimers()
    })

    expect(mockHandleResize).toHaveBeenCalledTimes(1)
    jest.useRealTimers()
  })

  it('should cache layout calculations', () => {
    const { result } = renderHook(() => useLayout())
    
    const grid1 = result.current.getGridLayout(4, true)
    const grid2 = result.current.getGridLayout(4, true)
    
    expect(grid1).toBe(grid2) // Should return cached value
  })

  it('should handle layout transitions with RAF', () => {
    jest.useFakeTimers()
    const mockRAF = jest.spyOn(window, 'requestAnimationFrame')
    const { result } = renderHook(() => useLayout())

    act(() => {
      result.current.handleLayoutTransition()
    })

    expect(document.documentElement.style.getPropertyValue('--layout-transition')).toBe('none')
    
    act(() => {
      mockRAF.mock.calls[0]?.[0](0)
    })

    expect(document.documentElement.style.getPropertyValue('--layout-transition'))
      .toBe(`all ${LAYOUT_CONSTANTS.TRANSITIONS.duration} ${LAYOUT_CONSTANTS.TRANSITIONS.timing}`)
    
    jest.useRealTimers()
  })
})

