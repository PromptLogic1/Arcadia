'use client'

import { useState, useMemo, useCallback, useTransition } from 'react'
import type { Discussion, Event } from '../types/types'
import { useDebounce } from '@/src/hooks/useDebounce'

interface UseSearchReturn<T> {
  filteredItems: T[]
  searchQuery: string
  setSearchQuery: (query: string) => void
  sortBy: 'newest' | 'hot'
  setSortBy: (sort: 'newest' | 'hot') => void
  selectedGame: string
  setSelectedGame: (game: string) => void
  selectedChallenge: string
  setSelectedChallenge: (challenge: string) => void
  isSearching: boolean
}

export function useSearch<T extends Discussion | Event>(
  items: readonly T[],
  searchKeys: (keyof T)[]
): UseSearchReturn<T> {
  const [searchQuery, setSearchQueryRaw] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'hot'>('newest')
  const [selectedGame, setSelectedGame] = useState('All Games')
  const [selectedChallenge, setSelectedChallenge] = useState('All Challenges')
  const [isPending, startTransition] = useTransition()

  // Debounce search query to prevent too many re-renders
  const debouncedSearch = useDebounce(searchQuery, 300)

  const setSearchQuery = useCallback((query: string) => {
    startTransition(() => {
      setSearchQueryRaw(query)
    })
  }, [])

  const filteredItems = useMemo(() => {
    // Create search index for better performance
    const searchIndex = new Map<T, string>()
    
    return items
      .filter(item => {
        // Get or create search string for item
        let searchString = searchIndex.get(item)
        if (!searchString) {
          searchString = searchKeys
            .map(key => {
              const value = item[key]
              return typeof value === 'string' ? value.toLowerCase() : ''
            })
            .join(' ')
          searchIndex.set(item, searchString)
        }

        const matchesSearch = !debouncedSearch || 
          searchString.includes(debouncedSearch.toLowerCase())

        const matchesGame = selectedGame === 'All Games' || item.game === selectedGame
        const matchesChallenge = selectedChallenge === 'All Challenges' || 
          ('challengeType' in item && item.challengeType === selectedChallenge)

        return matchesSearch && matchesGame && matchesChallenge
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.date).getTime() - new Date(a.date).getTime()
        }
        return 'upvotes' in a && 'upvotes' in b ? b.upvotes - a.upvotes : 0
      })
  }, [items, debouncedSearch, selectedGame, selectedChallenge, sortBy, searchKeys])

  return {
    filteredItems,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    selectedGame,
    setSelectedGame,
    selectedChallenge,
    setSelectedChallenge,
    isSearching: isPending
  }
} 