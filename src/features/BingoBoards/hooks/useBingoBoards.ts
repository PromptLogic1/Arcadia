import { useEffect } from 'react'
import { useAuth } from '@/src/hooks/useAuth'
import { useBingoBoards as useReduxBingoBoards } from '@/src/hooks/useBingoBoards'

export function useBingoBoards() {
  const { isAuthenticated } = useAuth()
  const { isLoading, error, initializeBoards } = useReduxBingoBoards()

  useEffect(() => {
    if (isAuthenticated) {
      initializeBoards()
    }
  }, [isAuthenticated, initializeBoards])

  return {
    isAuthenticated,
    isLoading,
    error,
  }
} 