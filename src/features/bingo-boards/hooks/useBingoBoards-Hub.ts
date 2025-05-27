import { useEffect } from 'react'
import { useAuth } from '@/src/hooks/useAuth'
import { useBingoBoards as useZustandBingoBoards, useBingoBoardsActions } from '@/src/lib/stores/bingo-boards-store'

export function useBingoBoards() {
  const { isAuthenticated } = useAuth()
  const { loading, error } = useZustandBingoBoards()
  const { setUserBoards } = useBingoBoardsActions()

  // Initialize boards when authenticated
  // Note: You might need to add an initializeBoards method to the store if needed
  useEffect(() => {
    if (isAuthenticated) {
      // Add initialization logic here if needed
      // For now, we'll just clear any errors
    }
  }, [isAuthenticated])

  return {
    isAuthenticated,
    isLoading: loading,
    error,
  }
} 