// community.tsx

'use client'

import React, { useState, useEffect, useCallback, Suspense, useRef } from 'react'
import { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import { MessageCircle, Calendar, Plus } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem
} from "@/components/ui/toggle-group"
import { NeonButton } from '@/components/ui/NeonButton'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Discussion, Event, Comment } from './community/types'
import { GAMES, CHALLENGE_TYPES, MOCK_DISCUSSIONS, MOCK_EVENTS } from './community/shared/constants'
import { SearchInput } from './community/shared/SearchInput'
import { useVirtualizer } from '@tanstack/react-virtual'

// Dynamic imports for better code splitting
const DiscussionCard = dynamic(() => import('./community/DiscussionCard'), {
  loading: () => <Skeleton className="h-40 w-full" />,
  ssr: false
})

const EventCard = dynamic(() => import('./community/EventCard'), {
  loading: () => <Skeleton className="h-40 w-full" />,
  ssr: false
})

const CreateDiscussionForm = dynamic(() => import('./community/CreateDiscussionForm'), {
  ssr: false
})

// Custom hook for debouncing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Add metadata
export const metadata: Metadata = {
  title: 'Arcadia Community',
  description: 'Join discussions and events with fellow gamers',
  openGraph: {
    title: 'Arcadia Community',
    description: 'Join discussions and events with fellow gamers',
    type: 'website'
  }
}

export function CommunityComponent() {
  const [activeTab, setActiveTab] = useState<'discussions' | 'events'>('discussions')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'hot'>('newest')
  const [selectedGame, setSelectedGame] = useState('All Games')
  const [selectedChallenge, setSelectedChallenge] = useState('All Challenges')
  const [selectedDiscussion, setSelectedDiscussion] = useState<Discussion | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isCreateDiscussionOpen, setIsCreateDiscussionOpen] = useState(false)

  // Add loading states for different sections
  const [isDiscussionsLoading, setIsDiscussionsLoading] = useState(true)
  const [isEventsLoading, setIsEventsLoading] = useState(true)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  const parentRef = useRef<HTMLDivElement>(null)

  const filteredAndSortedDiscussions = useCallback(() => {
    return MOCK_DISCUSSIONS
      .filter((discussion) => {
        const matchesSearchQuery =
          debouncedSearchQuery === '' ||
          discussion.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
          discussion.author.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
          discussion.game.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
          discussion.tags.some((tag: string) => tag.toLowerCase().includes(debouncedSearchQuery.toLowerCase()))

        const matchesGame = selectedGame === 'All Games' || discussion.game === selectedGame
        const matchesChallenge =
          selectedChallenge === 'All Challenges' || discussion.challengeType === selectedChallenge

        return matchesSearchQuery && matchesGame && matchesChallenge
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.date).getTime() - new Date(a.date).getTime()
        } else {
          return b.upvotes - a.upvotes
        }
      })
  }, [debouncedSearchQuery, selectedGame, selectedChallenge, sortBy])

  const filteredEvents = useCallback(() => {
    return MOCK_EVENTS.filter((event) => {
      return (
        debouncedSearchQuery === '' ||
        event.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        event.game.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        event.tags.some((tag: string) => tag.toLowerCase().includes(debouncedSearchQuery.toLowerCase()))
      )
    })
  }, [debouncedSearchQuery])

  const discussions = filteredAndSortedDiscussions()
  const events = filteredEvents()

  const discussionsVirtualizer = useVirtualizer({
    count: discussions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
    overscan: 5
  })

  const eventsVirtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
    overscan: 5
  })

  // Simulate API loading on initial mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false)
      setIsDiscussionsLoading(false)
      setIsEventsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  // Add loading state when filters change
  useEffect(() => {
    if (!isInitialLoad) {
      const section = activeTab === 'discussions' ? setIsDiscussionsLoading : setIsEventsLoading
      section(true)
      
      const timer = setTimeout(() => {
        section(false)
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [debouncedSearchQuery, selectedGame, selectedChallenge, sortBy, activeTab, isInitialLoad])

  const handleCreateDiscussion = (formData: Omit<Discussion, 'id' | 'comments' | 'upvotes' | 'date' | 'commentList'>) => {
    const newDiscussion: Discussion = {
      ...formData,
      id: Math.max(...MOCK_DISCUSSIONS.map(d => d.id)) + 1,
      comments: 0,
      upvotes: 0,
      date: new Date().toISOString(),
      commentList: []
    }
    
    // Update your state management here
    console.log('New discussion:', newDiscussion)
  }

  const handleUpvote = (discussionId: number) => {
    // In a real app, this would be an API call
    const updatedDiscussions = MOCK_DISCUSSIONS.map(discussion =>
      discussion.id === discussionId
        ? { ...discussion, upvotes: discussion.upvotes + 1 }
        : discussion
    )
    
    // Update your state management here
    console.log('Updated discussions:', updatedDiscussions)
  }

  const handleComment = (discussionId: number, commentData: Omit<Comment, 'id' | 'date'>) => {
    const newComment = {
      ...commentData,
      id: Math.floor(Math.random() * 10000),
      date: new Date().toISOString()
    } as Comment

    const updatedDiscussions = MOCK_DISCUSSIONS.map(discussion =>
      discussion.id === discussionId
        ? {
            ...discussion,
            comments: discussion.comments + 1,
            commentList: [...discussion.commentList, newComment]
          }
        : discussion
    )
    
    // Update your state management here
    console.log('Updated discussions with new comment:', updatedDiscussions)
  }

  // Virtualized lists with loading states
  const renderDiscussionsList = () => {
    if (isDiscussionsLoading) {
      return (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      )
    }

    return (
      <div ref={parentRef} className="h-[calc(100vh-300px)] overflow-auto">
        <div
          style={{
            height: `${discussionsVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {discussionsVirtualizer.getVirtualItems().map((virtualRow) => (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <DiscussionCard
                discussion={discussions[virtualRow.index]}
                isExpanded={selectedDiscussion?.id === discussions[virtualRow.index].id}
                onToggle={() => setSelectedDiscussion(
                  selectedDiscussion?.id === discussions[virtualRow.index].id 
                    ? null 
                    : discussions[virtualRow.index]
                )}
                onUpvote={handleUpvote}
                onComment={handleComment}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderEventsList = () => {
    if (isEventsLoading) {
      return (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      )
    }

    return (
      <div ref={parentRef} className="h-[calc(100vh-300px)] overflow-auto">
        <div
          style={{
            height: `${eventsVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {eventsVirtualizer.getVirtualItems().map((virtualRow) => (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <EventCard
                event={events[virtualRow.index]}
                isExpanded={selectedEvent?.id === events[virtualRow.index].id}
                onToggle={() => setSelectedEvent(
                  selectedEvent?.id === events[virtualRow.index].id 
                    ? null 
                    : events[virtualRow.index]
                )}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-gray-100">
      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-yellow-400">
          Arcadia Community
        </h1>

        {/* Tab buttons */}
        <div className="flex justify-center mb-8">
          <NeonButton
            className={`mr-4 ${
              activeTab === 'discussions' ? 'bg-cyan-500 text-gray-900' : 'bg-gray-800 text-gray-100'
            }`}
            onClick={() => setActiveTab('discussions')}
          >
            <MessageCircle className="mr-2 h-4 w-4" /> Discussions
          </NeonButton>
          <NeonButton
            className={`${
              activeTab === 'events' ? 'bg-cyan-500 text-gray-900' : 'bg-gray-800 text-gray-100'
            }`}
            onClick={() => setActiveTab('events')}
          >
            <Calendar className="mr-2 h-4 w-4" /> Events
          </NeonButton>
        </div>

        {/* Discussions tab content */}
        {activeTab === 'discussions' && (
          <Suspense fallback={<Skeleton className="h-40 w-full" />}>
            {/* Filters */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8">
              <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 mb-4 md:mb-0">
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search discussions..."
                />
                <Select value={selectedGame} onValueChange={setSelectedGame}>
                  <SelectTrigger className="bg-gray-800 border-cyan-500 focus:border-cyan-400 focus:ring-cyan-400">
                    <SelectValue placeholder="Select Game" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-cyan-500">
                    {GAMES.map((game) => (
                      <SelectItem key={game} value={game}>
                        {game}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedChallenge} onValueChange={setSelectedChallenge}>
                  <SelectTrigger className="bg-gray-800 border-cyan-500 focus:border-cyan-400 focus:ring-cyan-400">
                    <SelectValue placeholder="Select Challenge" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-cyan-500">
                    {CHALLENGE_TYPES.map((challenge) => (
                      <SelectItem key={challenge} value={challenge}>
                        {challenge}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-4">
                <ToggleGroup
                  type="single"
                  value={sortBy}
                  onValueChange={(value) => setSortBy(value as 'newest' | 'hot')}
                >
                  <ToggleGroupItem
                    value="newest"
                    className="bg-gray-800 border-cyan-500 data-[state=on]:bg-cyan-500 data-[state=on]:text-gray-900"
                  >
                    Newest
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="hot"
                    className="bg-gray-800 border-cyan-500 data-[state=on]:bg-cyan-500 data-[state=on]:text-gray-900"
                  >
                    Hot
                  </ToggleGroupItem>
                </ToggleGroup>
                <NeonButton onClick={() => setIsCreateDiscussionOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Create Discussion
                </NeonButton>
              </div>
            </div>

            {renderDiscussionsList()}
          </Suspense>
        )}

        {/* Events tab content */}
        {activeTab === 'events' && (
          <Suspense fallback={<Skeleton className="h-40 w-full" />}>
            <div className="flex flex-col md:flex-row justify-between items-center mb-8">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search events..."
              />
            </div>

            {renderEventsList()}
          </Suspense>
        )}
      </main>

      <AnimatePresence>
        {isCreateDiscussionOpen && (
          <CreateDiscussionForm 
            onClose={() => setIsCreateDiscussionOpen(false)} 
            onSubmit={handleCreateDiscussion}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Community() {
  return (
    <ErrorBoundary>
      <CommunityComponent />
    </ErrorBoundary>
  )
}
