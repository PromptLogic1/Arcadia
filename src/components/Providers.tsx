'use client'

import { ThemeProvider } from './ui/ThemeProvider'
import { useEffect } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // TODO: Initialize Supabase auth session
    // This will be implemented when proper auth is integrated
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  )
} 