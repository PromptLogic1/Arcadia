'use client'

import { Provider } from 'react-redux'
import { store } from '@/src/store'
import { ThemeProvider } from './_components/ThemeProvider'
import { useEffect } from 'react'
import { authService } from '@/lib/supabase_lib/supabase-auth'

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    authService.initializeAuth()
    const unsubscribe = authService.setupAuthListener()
    return () => {
      unsubscribe()
    }
  }, [])

  return (
    <Provider store={store}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </Provider>
  )
} 