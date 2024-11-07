import { useState, useMemo } from 'react'
import type { Discussion, Event } from '../types'

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
}

export function useSearch<T extends Discussion | Event>(
  items: readonly T[],
  searchKeys: (keyof T)[]
): UseSearchReturn<T> {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'hot'>('newest')
  const [selectedGame, setSelectedGame] = useState('All Games')
  const [selectedChallenge, setSelectedChallenge] = useState('All Challenges')

  const filteredItems = useMemo(() => {
    return items
      .filter(item => {
        const matchesSearch = searchQuery === '' || 
          searchKeys.some(key => {
            const value = item[key]
            return typeof value === 'string' && 
              value.toLowerCase().includes(searchQuery.toLowerCase())
          })

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
  }, [items, searchQuery, selectedGame, selectedChallenge, sortBy, searchKeys])

  return {
    filteredItems,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    selectedGame,
    setSelectedGame,
    selectedChallenge,
    setSelectedChallenge
  }
} 