'use client'

import { Provider } from 'react-redux'
import { store } from '@/src/store'
import { ThemeProvider } from './_components/ThemeProvider'
import { useEffect } from 'react'
import { authService } from '@/src/store/services/auth-service'

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    authService.initializeApp();
  }, []);

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