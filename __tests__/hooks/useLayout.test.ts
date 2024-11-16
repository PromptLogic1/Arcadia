import { renderHook, act } from '@testing-library/react'
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

  it('should emit layout change events', () => {
    const dispatchEvent = jest.spyOn(window, 'dispatchEvent')
    const { result } = renderHook(() => useLayout())

    act(() => {
      result.current.handleResize()
    })

    expect(dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: LAYOUT_CONSTANTS.EVENTS.layoutChange
      })
    )
  })

  it('should handle layout transitions', () => {
    const { result } = renderHook(() => useLayout())
    
    act(() => {
      result.current.handleLayoutTransition()
    })

    const transition = document.documentElement.style.getPropertyValue('--layout-transition')
    expect(transition).toBeDefined()
  })

  it('should cleanup on unmount', () => {
    const removeEventListener = jest.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useLayout())
    
    unmount()
    
    expect(removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
  })
})

