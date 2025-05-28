'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  Suspense,
  useRef,
} from 'react';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle, Calendar, Plus } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { NeonButton } from '@/components/ui/NeonButton';
import { ErrorBoundary } from '../shared/ErrorBoundary';
import {
  GAMES,
  CHALLENGE_TYPES,
  MOCK_DISCUSSIONS,
  MOCK_EVENTS,
} from '@/src/features/community/shared/constants';
import { SearchInput } from '@/src/features/community/shared/SearchInput';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  useCommunity,
  useCommunityActions,
  type Discussion,
  type Comment,
} from '@/src/lib/stores/community-store';

// Dynamic imports for better code splitting
const DiscussionCard = dynamic(() => import('./DiscussionCard'), {
  loading: () => <Skeleton className="h-40 w-full" />,
});

const EventCard = dynamic(() => import('./EventCard'), {
  loading: () => <Skeleton className="h-40 w-full" />,
});

const CreateDiscussionForm = dynamic(() => import('./CreateDiscussionForm'), {
  loading: () => <Skeleton className="h-96 w-full" />,
});

// Custom hook for debouncing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Add metadata
export const metadata: Metadata = {
  title: 'Arcadia Community',
  description: 'Join discussions and events with fellow gamers',
  openGraph: {
    title: 'Arcadia Community',
    description: 'Join discussions and events with fellow gamers',
    type: 'website',
  },
};

export function CommunityComponent() {
  const [activeTab, setActiveTab] = useState<'discussions' | 'events'>(
    'discussions'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'hot'>('newest');
  const [selectedGame, setSelectedGame] = useState('All Games');
  const [selectedChallenge, setSelectedChallenge] = useState('All Challenges');
  const [isCreateDiscussionOpen, setIsCreateDiscussionOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  // Use Zustand store
  const { discussions, comments, events, selectedDiscussion, loading } =
    useCommunity();
  const {
    setDiscussions,
    setEvents,
    setSelectedDiscussion,
    addDiscussion,
    upvoteDiscussion,
    addComment,
  } = useCommunityActions();

  // Add loading states for different sections
  const [isDiscussionsLoading, setIsDiscussionsLoading] = useState(true);
  const [isEventsLoading, setIsEventsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const parentRef = useRef<HTMLDivElement>(null);

  // Initialize mock data
  useEffect(() => {
    if (discussions.length === 0) {
      setDiscussions([...MOCK_DISCUSSIONS]);
    }
    if (events.length === 0) {
      setEvents([...MOCK_EVENTS]);
    }
  }, [discussions.length, events.length, setDiscussions, setEvents]);

  const filteredAndSortedDiscussions = useCallback(() => {
    return discussions
      .filter(discussion => {
        const matchesSearchQuery =
          debouncedSearchQuery === '' ||
          discussion.title
            .toLowerCase()
            .includes(debouncedSearchQuery.toLowerCase()) ||
          discussion.content
            .toLowerCase()
            .includes(debouncedSearchQuery.toLowerCase()) ||
          discussion.game
            .toLowerCase()
            .includes(debouncedSearchQuery.toLowerCase()) ||
          (discussion.tags &&
            discussion.tags.some(tag =>
              tag.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
            ));

        const matchesGame =
          selectedGame === 'All Games' || discussion.game === selectedGame;
        const matchesChallenge =
          selectedChallenge === 'All Challenges' ||
          discussion.challenge_type === selectedChallenge;

        return matchesSearchQuery && matchesGame && matchesChallenge;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bDate - aDate;
        } else {
          const aUpvotes = a.upvotes || 0;
          const bUpvotes = b.upvotes || 0;
          return bUpvotes - aUpvotes;
        }
      });
  }, [
    discussions,
    debouncedSearchQuery,
    selectedGame,
    selectedChallenge,
    sortBy,
  ]);

  const filteredEvents = useCallback(() => {
    return events.filter(event => {
      return (
        debouncedSearchQuery === '' ||
        event.title
          .toLowerCase()
          .includes(debouncedSearchQuery.toLowerCase()) ||
        event.description
          .toLowerCase()
          .includes(debouncedSearchQuery.toLowerCase()) ||
        event.tags.some(tag =>
          tag.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
        )
      );
    });
  }, [events, debouncedSearchQuery]);

  const filteredDiscussions = filteredAndSortedDiscussions();
  const filteredEventsResult = filteredEvents();

  const discussionsVirtualizer = useVirtualizer({
    count: filteredDiscussions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
    overscan: 5,
  });

  const eventsVirtualizer = useVirtualizer({
    count: filteredEventsResult.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
    overscan: 5,
  });

  // Simulate API loading on initial mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
      setIsDiscussionsLoading(false);
      setIsEventsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Add loading state when filters change
  useEffect(() => {
    if (!isInitialLoad) {
      const section =
        activeTab === 'discussions'
          ? setIsDiscussionsLoading
          : setIsEventsLoading;
      section(true);

      const timer = setTimeout(() => {
        section(false);
      }, 500);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [
    debouncedSearchQuery,
    selectedGame,
    selectedChallenge,
    sortBy,
    activeTab,
    isInitialLoad,
  ]);

  const handleCreateDiscussion = (formData: {
    title: string;
    content: string;
    game: string;
    challenge_type?: string | null;
    tags?: string[] | null;
  }) => {
    const newDiscussion: Discussion = {
      ...formData,
      id: Math.max(...discussions.map(d => d.id)) + 1,
      author_id: 'current_user', // In real app, get from auth
      challenge_type: formData.challenge_type || null,
      tags: formData.tags || null,
      upvotes: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    addDiscussion(newDiscussion);
    setIsCreateDiscussionOpen(false);
  };

  const handleUpvote = (discussionId: number) => {
    upvoteDiscussion(discussionId);
  };

  const handleComment = (
    discussionId: number,
    commentData: {
      content: string;
      author_id: string | null;
      discussion_id: number | null;
      upvotes: number | null;
    }
  ) => {
    const newComment: Comment = {
      ...commentData,
      id: Math.floor(Math.random() * 10000),
      discussion_id: discussionId,
      upvotes: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    addComment(newComment);
  };

  // Virtualized lists with loading states
  const renderDiscussionsList = () => {
    if (isDiscussionsLoading || loading) {
      return (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      );
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
          {discussionsVirtualizer.getVirtualItems().map(virtualRow => {
            const discussion = filteredDiscussions[virtualRow.index];
            if (!discussion) return null;

            return (
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
                  discussion={discussion}
                  comments={comments}
                  isExpanded={selectedDiscussion?.id === discussion.id}
                  onToggle={() =>
                    setSelectedDiscussion(
                      selectedDiscussion?.id === discussion.id
                        ? null
                        : discussion
                    )
                  }
                  onUpvote={handleUpvote}
                  onComment={handleComment}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderEventsList = () => {
    if (isEventsLoading || loading) {
      return (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      );
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
          {eventsVirtualizer.getVirtualItems().map(virtualRow => {
            const event = filteredEventsResult[virtualRow.index];
            if (!event) return null;

            return (
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
                  event={event}
                  isExpanded={selectedEventId === event.id}
                  onToggle={() =>
                    setSelectedEventId(
                      selectedEventId === event.id ? null : event.id
                    )
                  }
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-900 text-gray-100">
      {/* Header & Navigation */}
      <header className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-fuchsia-500/5 to-transparent" />
        <div className="container relative mx-auto px-4 py-8">
          <h1 className="mb-6 text-center text-4xl font-bold">
            <span className="bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-yellow-400 bg-clip-text text-transparent drop-shadow-lg">
              Arcadia Community
            </span>
          </h1>

          {/* Navigation Tabs */}
          <div className="mb-8 flex justify-center">
            <div className="rounded-lg border border-gray-700/50 bg-gray-800/50 p-1 backdrop-blur-sm">
              <NeonButton
                className={`mr-1 transition-all duration-300 ${
                  activeTab === 'discussions'
                    ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white shadow-lg shadow-cyan-500/20'
                    : 'bg-gray-800/50 text-gray-300 hover:text-white'
                }`}
                onClick={() => setActiveTab('discussions')}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Discussions
              </NeonButton>
              <NeonButton
                className={`transition-all duration-300 ${
                  activeTab === 'events'
                    ? 'bg-gradient-to-r from-lime-500 to-emerald-500 text-white shadow-lg shadow-lime-500/20'
                    : 'bg-gray-800/50 text-gray-300 hover:text-white'
                }`}
                onClick={() => setActiveTab('events')}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Events
              </NeonButton>
            </div>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700/50" />
            </div>
            <div className="relative flex justify-center">
              <div className="bg-gray-900 px-2">
                <div className="h-2 w-2 rounded-full bg-gradient-to-r from-cyan-500 to-fuchsia-500" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto flex-1 px-4 py-8">
        {/* Discussions tab content */}
        {activeTab === 'discussions' && (
          <Suspense fallback={<Skeleton className="h-40 w-full" />}>
            {/* Search & Filters */}
            <div className="mb-8 flex flex-col items-center justify-between rounded-lg border border-gray-700/50 bg-gray-800/30 p-4 md:flex-row">
              <div className="mb-4 flex flex-col space-y-2 md:mb-0 md:flex-row md:space-x-4 md:space-y-0">
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search discussions..."
                  className="min-w-[300px]"
                />
                <div className="flex space-x-4">
                  <Select value={selectedGame} onValueChange={setSelectedGame}>
                    <SelectTrigger className="min-w-[180px] border-gray-700/50 bg-gray-800/50 transition-colors hover:border-cyan-500/50 focus:border-cyan-500">
                      <SelectValue placeholder="Select Game" />
                    </SelectTrigger>
                    <SelectContent className="border-gray-700 bg-gray-800">
                      {GAMES.map(game => (
                        <SelectItem
                          key={game}
                          value={game}
                          className="cursor-pointer hover:bg-cyan-500/10"
                        >
                          {game}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={selectedChallenge}
                    onValueChange={setSelectedChallenge}
                  >
                    <SelectTrigger className="min-w-[180px] border-gray-700/50 bg-gray-800/50 transition-colors hover:border-cyan-500/50 focus:border-cyan-500">
                      <SelectValue placeholder="Select Challenge" />
                    </SelectTrigger>
                    <SelectContent className="border-gray-700 bg-gray-800">
                      {CHALLENGE_TYPES.map(challenge => (
                        <SelectItem
                          key={challenge}
                          value={challenge}
                          className="cursor-pointer hover:bg-cyan-500/10"
                        >
                          {challenge}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <ToggleGroup
                  type="single"
                  value={sortBy}
                  onValueChange={(value: string) =>
                    setSortBy(value as 'newest' | 'hot')
                  }
                  className="rounded-lg border border-gray-700/50 bg-gray-800/50 p-1"
                >
                  <ToggleGroupItem
                    value="newest"
                    className="data-[state=on]:bg-gradient-to-r data-[state=on]:from-cyan-500 data-[state=on]:to-fuchsia-500 data-[state=on]:text-white"
                  >
                    Newest
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="hot"
                    className="data-[state=on]:bg-gradient-to-r data-[state=on]:from-orange-500 data-[state=on]:to-red-500 data-[state=on]:text-white"
                  >
                    Hot
                  </ToggleGroupItem>
                </ToggleGroup>
                <NeonButton
                  onClick={() => setIsCreateDiscussionOpen(true)}
                  className="transform bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white shadow-lg shadow-cyan-500/20 transition-all duration-300 hover:scale-105 hover:from-cyan-600 hover:to-fuchsia-600"
                >
                  <Plus className="mr-2 h-4 w-4" /> Create Discussion
                </NeonButton>
              </div>
            </div>

            {/* Discussion List */}
            {renderDiscussionsList()}
          </Suspense>
        )}

        {/* Events tab content */}
        {activeTab === 'events' && (
          <Suspense fallback={<Skeleton className="h-40 w-full" />}>
            <div className="mb-8 flex flex-col items-center justify-between md:flex-row">
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
  );
}

export default function Community() {
  return (
    <ErrorBoundary>
      <CommunityComponent />
    </ErrorBoundary>
  );
}
