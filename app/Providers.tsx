'use client'

import { Provider } from 'react-redux'
import { store } from '@/src/store'
import { ThemeProvider } from './_components/ThemeProvider'
import { useEffect } from 'react'
import { authService } from '@/src/store/services/auth-service'
import { userDataService } from '@/src/store/services/user-service'

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize app state
    authService.initializeApp()
    userDataService.initializeApp()
    
    // Setup auth listener
    const { data: { subscription: authSubscription } } = authService.setupAuthListener()
    const { data: { subscription: userDataSubscription } } = userDataService.setupUserDataListener()
    
    return () => {
      authSubscription.unsubscribe()
      userDataSubscription.unsubscribe()
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