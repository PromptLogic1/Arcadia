import { useState, useEffect } from 'react'

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

export type Breakpoint = keyof typeof BREAKPOINTS

export function useResponsive() {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('lg')
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [isDesktop, setIsDesktop] = useState(true)

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      
      // Update breakpoint
      if (width < BREAKPOINTS.sm) setBreakpoint('sm')
      else if (width < BREAKPOINTS.md) setBreakpoint('md')
      else if (width < BREAKPOINTS.lg) setBreakpoint('lg')
      else if (width < BREAKPOINTS.xl) setBreakpoint('xl')
      else setBreakpoint('2xl')

      // Update device type
      setIsMobile(width < BREAKPOINTS.sm)
      setIsTablet(width >= BREAKPOINTS.sm && width < BREAKPOINTS.lg)
      setIsDesktop(width >= BREAKPOINTS.lg)
    }

    // Initial check
    handleResize()

    // Add event listener
    window.addEventListener('resize', handleResize)
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return {
    breakpoint,
    isMobile,
    isTablet,
    isDesktop,
    minWidth: (bp: Breakpoint) => window.innerWidth >= BREAKPOINTS[bp],
    maxWidth: (bp: Breakpoint) => window.innerWidth < BREAKPOINTS[bp]
  }
} 