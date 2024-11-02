// community.tsx

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  MessageCircle,
  Plus,
  Calendar,
} from 'lucide-react'
import { AnimatePresence } from 'framer-motion'

import DiscussionCard from '@/components/community/DiscussionCard'
import EventCard from '@/components/community/EventCard'
import DiscussionView from '@/components/community/DiscussionView'
import EventView from '@/components/community/EventView'
import CreateDiscussionForm from '@/components/community/CreateDiscussionForm'

import { GAMES, CHALLENGE_TYPES, MOCK_DISCUSSIONS, MOCK_EVENTS } from './community/shared/constants'
import { Discussion, Event, NeonButtonProps, Comment } from './community/types'
import { SearchInput } from './community/shared/SearchInput'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const NeonButton: React.FC<NeonButtonProps> = ({ children, className = '', ...props }) => (
  <Button
    className={`relative overflow-hidden transition-all duration-300 ${className}`}
    {...props}
  >
    <span className="relative z-10 flex items-center">{children}</span>
    <span className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-fuchsia-500 opacity-50 blur-md transition-opacity duration-300 group-hover:opacity-75"></span>
  </Button>
)

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

export function CommunityComponent() {
  const [activeTab, setActiveTab] = useState<'discussions' | 'events'>('discussions')
  const [searchQuery, setSearchQuery] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [sortBy, setSortBy] = useState<'newest' | 'hot'>('newest')
  const [selectedGame, setSelectedGame] = useState('All Games')
  const [selectedChallenge, setSelectedChallenge] = useState('All Challenges')
  const [selectedDiscussion, setSelectedDiscussion] = useState<Discussion | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isCreateDiscussionOpen, setIsCreateDiscussionOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const debouncedSearchQuery = useDebounce(searchQuery, 300)

  useEffect(() => {
    const closeMenuOnResize = () => {
      if (window.innerWidth >= 768 && isMenuOpen) {
        setIsMenuOpen(false)
      }
    }

    window.addEventListener('resize', closeMenuOnResize)
    return () => window.removeEventListener('resize', closeMenuOnResize)
  }, [isMenuOpen])

  useEffect(() => {
    setIsLoading(true)
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [debouncedSearchQuery, selectedGame, selectedChallenge, sortBy])

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
          <>
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

            {/* Discussion cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoading ? (
                <>
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-40 bg-gray-800" />
                  ))}
                </>
              ) : filteredAndSortedDiscussions().length === 0 ? (
                <div className="col-span-full text-center">
                  <p className="text-lg">No discussions found.</p>
                </div>
              ) : (
                filteredAndSortedDiscussions().map((discussion) => (
                  <DiscussionCard
                    key={discussion.id}
                    discussion={discussion}
                    onClick={() => setSelectedDiscussion(discussion)}
                    onUpvote={handleUpvote}
                  />
                ))
              )}
            </div>
          </>
        )}

        {/* Events tab content */}
        {activeTab === 'events' && (
          <>
            {/* Events cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoading ? (
                <>
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-40 bg-gray-800" />
                  ))}
                </>
              ) : filteredEvents().length === 0 ? (
                <div className="col-span-full text-center">
                  <p className="text-lg">No events found.</p>
                </div>
              ) : (
                filteredEvents().map((event) => (
                  <EventCard
                    key={event.id}
                    event={event as Event}
                    onClick={() => setSelectedEvent(event as Event)}
                  />
                ))
              )}
            </div>
          </>
        )}
      </main>

      {/* Dialogs */}
      <AnimatePresence>
        {selectedDiscussion && (
          <DiscussionView
            discussion={selectedDiscussion}
            onClose={() => setSelectedDiscussion(null)}
            onComment={handleComment}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedEvent && (
          <EventView event={selectedEvent} onClose={() => setSelectedEvent(null)} />
        )}
      </AnimatePresence>

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
