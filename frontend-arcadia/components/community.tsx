"use client"

import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { GamepadIcon, MessageCircle, Search, ThumbsUp, Users, Menu, X, Download, ChevronRight, Bold, Italic, Underline, List, ArrowUpRight, Calendar, Trophy, MapPin, Clock, User, Tag } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { motion, AnimatePresence } from "framer-motion"
import { Skeleton } from "@/components/ui/skeleton"

import DiscussionCard from "@/components/community/DiscussionCard"
import EventCard from "@/components/community/EventCard"
import DiscussionView from "@/components/community/DiscussionView"
import EventView from "@/components/community/EventView"
import CreateDiscussionForm from "@/components/community/CreateDiscussionForm"

interface Discussion {
  id: number;
  author: string;
  avatar: string;
  title: string;
  game: string;
  challengeType: string | null;
  comments: number;
  upvotes: number;
  content: string;
  date: string;
  tags: string[];
}

interface Event {
  id: number;
  title: string;
  date: Date;
  game: string;
  participants: number;
  prize: string;
  description: string;
  tags: string[];
}

const discussionData: Discussion[] = [
  {
    id: 1,
    author: "John Doe",
    avatar: "https://i.pravatar.cc/150?img=1",
    title: "Elden Ring Speedrun Challenge",
    game: "Elden Ring",
    challengeType: "Speed Run",
    comments: 12,
    upvotes: 25,
    content: "Join me in a speedrun challenge of Elden Ring. Let's see who can complete the game the fastest!",
    date: "2023-07-15",
    tags: ["Elden Ring", "Speedrun", "Challenge"]
  },
  {
    id: 2,
    author: "Jane Smith",
    avatar: "https://i.pravatar.cc/150?img=2",
    title: "Fortnite Bingo Battle",
    game: "Fortnite",
    challengeType: "Bingo Battle",
    comments: 8,
    upvotes: 18,
    content: "Join the Fortnite Bingo Battle! First one to complete a full row wins a special prize!",
    date: "2023-07-14",
    tags: ["Fortnite", "Bingo", "Battle"]
  },
  {
    id: 3,
    author: "Bob Johnson",
    avatar: "https://i.pravatar.cc/150?img=3",
    title: "World of Warcraft Win Challenge",
    game: "World of Warcraft",
    challengeType: "Win Challenge",
    comments: 15,
    upvotes: 32,
    content: "I'm challenging anyone to a duel in World of Warcraft. Who's up for it?",
    date: "2023-07-13",
    tags: ["World of Warcraft", "Duel", "Challenge"]
  },
  {
    id: 4,
    author: "Alice Brown",
    avatar: "https://i.pravatar.cc/150?img=4",
    title: "Cyberpunk 2077 Speedrun Challenge",
    game: "Cyberpunk 2077",
    challengeType: "Speed Run",
    comments: 10,
    upvotes: 20,
    content: "Join me in a speedrun challenge of Cyberpunk 2077. Let's see who can complete the game the fastest!",
    date: "2023-07-12",
    tags: ["Cyberpunk 2077", "Speedrun", "Challenge"]
  },
  {
    id: 5,
    author: "Charlie Green",
    avatar: "https://i.pravatar.cc/150?img=5",
    title: "Elden Ring Boss Battle",
    game: "Elden Ring",
    challengeType: "Boss Battle",
    comments: 18,
    upvotes: 35,
    content: "Who's up for a boss battle in Elden Ring? Let's see who can defeat the most powerful enemies!",
    date: "2023-07-11",
    tags: ["Elden Ring", "Boss", "Battle"]
  },
  {
    id: 6,
    author: "Emily White",
    avatar: "https://i.pravatar.cc/150?img=6",
    title: "Fortnite Creative Map Challenge",
    game: "Fortnite",
    challengeType: "Creative Map",
    comments: 14,
    upvotes: 28,
    content: "Join the Fortnite Creative Map Challenge! Build the best fortress and defend it against waves of enemies!",
    date: "2023-07-10",
    tags: ["Fortnite", "Creative", "Challenge"]
  },
  {
    id: 7,
    author: "David Black",
    avatar: "https://i.pravatar.cc/150?img=7",
    title: "World of Warcraft PvP Tournament",
    game: "World of Warcraft",
    challengeType: "PvP Tournament",
    comments: 20,
    upvotes: 40,
    content: "Join the World of Warcraft PvP Tournament! Prove your skills in a series of matches and win a special prize!",
    date: "2023-07-09",
    tags: ["World of Warcraft", "PvP", "Tournament"]
  },
  {
    id: 8,
    author: "Sophia Gray",
    avatar: "https://i.pravatar.cc/150?img=8",
    title: "Cyberpunk 2077 Story Mode Challenge",
    game: "Cyberpunk 2077",
    challengeType: "Story Mode",
    comments: 12,
    upvotes: 22,
    content: "Join me in a story mode challenge of Cyberpunk 2077. Let's see who can make the most impactful decisions!",
    date: "2023-07-08",
    tags: ["Cyberpunk 2077", "Story", "Challenge"]
  },
  {
    id: 9,
    author: "Michael Brown",
    avatar: "https://i.pravatar.cc/150?img=9",
    title: "Elden Ring Co-op Adventure",
    game: "Elden Ring",
    challengeType: "Co-op Adventure",
    comments: 25,
    upvotes: 45,
    content: "Looking for players to join me in a co-op adventure of Elden Ring. Let's explore the Lands Between together!",
    date: "2023-07-07",
    tags: ["Elden Ring", "Co-op", "Adventure"]
  },
  {
    id: 10,
    author: "Olivia Davis",
    avatar: "https://i.pravatar.cc/150?img=10",
    title: "Fortnite Dance Battle",
    game: "Fortnite",
    challengeType: "Dance Battle",
    comments: 16,
    upvotes: 30,
    content: "Join the Fortnite Dance Battle! Show off your best dance moves and win a special prize!",
    date: "2023-07-06",
    tags: ["Fortnite", "Dance", "Battle"]
  }
]

const eventData: Event[] = [
  {
    id: 1,
    title: "Elden Ring Speedrun Tournament",
    date: new Date("2023-08-01"),
    game: "Elden Ring",
    participants: 100,
    prize: "$1000",
    description: "Join the Elden Ring Speedrun Tournament and compete against other players. The fastest time wins a $1000 prize!",
    tags: ["Elden Ring", "Speedrun", "Tournament"]
  },
  {
    id: 2,
    title: "Fortnite Creative Map Contest",
    date: new Date("2023-08-15"),
    game: "Fortnite",
    participants: 200,
    prize: "$2000",
    description: "Create the most innovative and unique Fortnite Creative Map and win a $2000 prize!",
    tags: ["Fortnite", "Creative", "Contest"]
  },
  {
    id: 3,
    title: "World of Warcraft PvP Tournament",
    date: new Date("2023-09-01"),
    game: "World of Warcraft",
    participants: 150,
    prize: "$1500",
    description: "Join the World of Warcraft PvP Tournament and prove your skills in a series of matches. The winner takes home a $1500 prize!",
    tags: ["World of Warcraft", "PvP", "Tournament"]
  },
  {
    id: 4,
    title: "Cyberpunk 2077 Story Mode Challenge",
    date: new Date("2023-09-15"),
    game: "Cyberpunk 2077",
    participants: 120,
    prize: "$1200",
    description: "Join the Cyberpunk 2077 Story Mode Challenge and make the most impactful decisions. The player with the best story wins a $1200 prize!",
    tags: ["Cyberpunk 2077", "Story", "Challenge"]
  },
  {
    id: 5,
    title: "Elden Ring Co-op Adventure",
    date: new Date("2023-10-01"),
    game: "Elden Ring",
    participants: 250,
    prize: "$2500",
    description: "Join the Elden Ring Co-op Adventure and explore the Lands Between with other players. The group that completes the most challenges wins a $2500 prize!",
    tags: ["Elden Ring", "Co-op", "Adventure"]
  },
  {
    id: 6,
    title: "Fortnite Dance Battle",
    date: new Date("2023-10-15"),
    game: "Fortnite",
    participants: 300,
    prize: "$3000",
    description: "Join the Fortnite Dance Battle and show off your best dance moves. The player with the most votes wins a $3000 prize!",
    tags: ["Fortnite", "Dance", "Battle"]
  }
]

const games = ["All Games", "Elden Ring", "Fortnite", "World of Warcraft", "Cyberpunk 2077"]
const challengeTypes = ["All Challenges", "Speed Run", "Win Challenge", "Bingo Battle"]

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

const NeonButton: React.FC<NeonButtonProps> = ({ children, className, ...props }) => (
  <Button
    className={`relative overflow-hidden transition-all duration-300 ${className}`}
    {...props}
  >
    <span className="relative z-10 flex items-center">{children}</span>
    <span className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-fuchsia-500 opacity-50 blur-md transition-opacity duration-300 group-hover:opacity-75"></span>
  </Button>
)

export function CommunityComponent() {
  const [activeTab, setActiveTab] = useState<"discussions" | "events">("discussions")
  const [searchQuery, setSearchQuery] = useState("")
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [language, setLanguage] = useState("en")
  const [sortBy, setSortBy] = useState<"newest" | "hot">("newest")
  const [selectedGame, setSelectedGame] = useState("All Games")
  const [selectedChallenge, setSelectedChallenge] = useState("All Challenges")
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
    return discussionData
      .filter(
        (discussion) =>
          (debouncedSearchQuery === "" || discussion.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
            discussion.author.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
            discussion.game.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
            discussion.tags.some(tag => tag.toLowerCase().includes(debouncedSearchQuery.toLowerCase()))) &&
          (selectedGame === "All Games" || discussion.game === selectedGame) &&
          (selectedChallenge === "All Challenges" || discussion.challengeType === selectedChallenge)
      )
      .sort((a, b) => {
        if (sortBy === "newest") {
          return new Date(b.date).getTime() - new Date(a.date).getTime()
        } else {
          return b.upvotes - a.upvotes
        }
      })
  }, [debouncedSearchQuery, selectedGame, selectedChallenge, sortBy])

  const filteredEvents = useCallback(() => {
    return eventData.filter(
      (event) =>
        (debouncedSearchQuery === "" || event.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
          event.game.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
          event.tags.some(tag => tag.toLowerCase().includes(debouncedSearchQuery.toLowerCase())))
    )
  }, [debouncedSearchQuery])

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-cyan-500 bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-gray-900/75">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <GamepadIcon className="h-6 w-6 text-cyan-400" />
            <span className="text-lg font-semibold">Arcadia</span>
          </Link>
          <nav className="hidden md:flex space-x-4">
            <Link href="/" className="hover:text-cyan-400">Home</Link>
            <Link href="/games" className="hover:text-cyan-400">Games</Link>
            <Link href="/community" className="hover:text-cyan-400">Community</Link>
            <Link href="/about" className="hover:text-cyan-400">About</Link>
          </nav>
          <div className="flex items-center space-x-4">
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="hidden md:block bg-gray-800 border-cyan-500 focus:border-cyan-400 focus:ring-cyan-400"
            />
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="bg-gray-800 border-cyan-500 focus:border-cyan-400 focus:ring-cyan-400">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-cyan-500">
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-gray-800 py-4"
          >
            <div className="container mx-auto px-4">
              <div className="flex flex-col space-y-2">
                <Link href="/" className="hover:text-cyan-400">Home</Link>
                <Link href="/games" className="hover:text-cyan-400">Games</Link>
                <Link href="/community" className="hover:text-cyan-400">Community</Link>
                <Link href="/about" className="hover:text-cyan-400">About</Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-yellow-400">
          Arcadia Community
        </h1>

        {/* Tab buttons */}
        <div className="flex justify-center mb-8">
          <NeonButton
            className={`mr-4 ${activeTab === "discussions" ? "bg-cyan-500 text-gray-900" : "bg-gray-800 text-gray-100"}`}
            onClick={() => setActiveTab("discussions")}
          >
            <MessageCircle className="mr-2 h-4 w-4" /> Discussions
          </NeonButton>
          <NeonButton
            className={`${activeTab === "events" ? "bg-cyan-500 text-gray-900" : "bg-gray-800 text-gray-100"}`}
            onClick={() => setActiveTab("events")}
          >
            <Calendar className="mr-2 h-4 w-4" /> Events
          </NeonButton>
        </div>

        {/* Discussions tab content */}
        {activeTab === "discussions" && (
          <>
            {/* Filters */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8">
              <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 mb-4 md:mb-0">
                <Select value={selectedGame} onValueChange={setSelectedGame}>
                  <SelectTrigger className="bg-gray-800 border-cyan-500 focus:border-cyan-400 focus:ring-cyan-400">
                    <SelectValue placeholder="Select Game" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-cyan-500">
                    {games.map(game => (
                      <SelectItem key={game} value={game}>{game}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedChallenge} onValueChange={setSelectedChallenge}>
                  <SelectTrigger className="bg-gray-800 border-cyan-500 focus:border-cyan-400 focus:ring-cyan-400">
                    <SelectValue placeholder="Select Challenge" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-cyan-500">
                    {challengeTypes.map(challenge => (
                      <SelectItem key={challenge} value={challenge}>{challenge}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-4">
                <ToggleGroup type="single" value={sortBy} onValueChange={setSortBy}>
                  <ToggleGroupItem value="newest" className="bg-gray-800 border-cyan-500 data-[state=on]:bg-cyan-500 data-[state=on]:text-gray-900">
                    Newest
                  </ToggleGroupItem>
                  <ToggleGroupItem value="hot" className="bg-gray-800 border-cyan-500 data-[state=on]:bg-cyan-500 data-[state=on]:text-gray-900">
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
                filteredAndSortedDiscussions().map(discussion => (
                  <DiscussionCard key={discussion.id} discussion={discussion} onClick={() => setSelectedDiscussion(discussion)} />
                ))
              )}
            </div>
          </>
        )}

        {/* Events tab content */}
        {activeTab === "events" && (
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
                filteredEvents().map(event => (
                  <EventCard key={event.id} event={event} onClick={() => setSelectedEvent(event)} />
                ))
              )}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-cyan-500 bg-gray-900 py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <GamepadIcon className="h-6 w-6 text-cyan-400" />
            <span className="text-lg font-semibold">Arcadia</span>
          </div>
          <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
            <Link href="/" className="hover:text-cyan-400">Home</Link>
            <Link href="/games" className="hover:text-cyan-400">Games</Link>
            <Link href="/community" className="hover:text-cyan-400">Community</Link>
            <Link href="/about" className="hover:text-cyan-400">About</Link>
          </div>
          <div className="flex items-center space-x-4">
            <a href="#" className="hover:text-cyan-400">
              <Download className="h-5 w-5" /> Download
            </a>
            <a href="#" className="hover:text-cyan-400">
              <ArrowUpRight className="h-5 w-5" /> Visit Website
            </a>
          </div>
        </div>
      </footer>

      {/* Dialogs */}
      <AnimatePresence>
        {selectedDiscussion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <DiscussionView 
              discussion={selectedDiscussion} 
              onClose={() => setSelectedDiscussion(null)} 
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <EventView 
              event={selectedEvent} 
              onClose={() => setSelectedEvent(null)} 
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCreateDiscussionOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <CreateDiscussionForm 
              onClose={() => setIsCreateDiscussionOpen(false)} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

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