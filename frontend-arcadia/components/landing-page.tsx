'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useEmblaCarousel from 'embla-carousel-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import Link from "next/link"
import Image from "next/image"
import { GamepadIcon, Download, Play, Grid, Zap, Trophy, Puzzle, ChevronRight, ChevronLeft, Users, Monitor, Calendar, MessageSquare, Medal, Search, Bell, Menu, LogIn, UserPlus, X } from 'lucide-react'

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState([
    { id: 1, message: "New challenge available!", read: false },
    { id: 2, message: "You've been invited to a tournament!", read: false },
    { id: 3, message: "Your friend beat your high score!", read: true },
  ])

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })))
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-cyan-500 bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-gray-900/75">
      <div className="container flex h-20 items-center justify-between px-4 md:px-6">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2">
            <GamepadIcon className="h-10 w-10 text-cyan-400" aria-hidden="true" />
            <span className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-pink-500 to-yellow-400">Arcadia</span>
          </Link>
        </div>
        <nav className="hidden md:flex items-center space-x-8">
          <Link href="#" className="text-lg font-medium text-cyan-400 hover:text-cyan-300 transition-colors py-2 px-3 rounded-full bg-cyan-500/10">Home</Link>
          <Link href="#challenges" className="text-lg font-medium text-cyan-200 hover:text-cyan-400 transition-colors py-2 px-3 rounded-full hover:bg-cyan-500/10">Challenges</Link>
          <Link href="#" className="text-lg font-medium text-cyan-200 hover:text-cyan-400 transition-colors py-2 px-3 rounded-full hover:bg-cyan-500/10">Community</Link>
          <Link href="#" className="text-lg font-medium text-cyan-200 hover:text-cyan-400 transition-colors py-2 px-3 rounded-full hover:bg-cyan-500/10">Events</Link>
          <Link href="#" className="text-lg font-medium text-cyan-200 hover:text-cyan-400 transition-colors py-2 px-3 rounded-full hover:bg-cyan-500/10">About</Link>
        </nav>
        <div className="flex items-center space-x-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 rounded-full border border-cyan-500/20" aria-label="Search">
                <Search className="h-5 w-5" aria-hidden="true" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 bg-gray-800 border border-cyan-500">
              <form className="flex items-center border-b border-cyan-500">
                <Input 
                  type="search" 
                  placeholder="Search..." 
                  className="flex-1 border-0 focus:ring-0 bg-transparent text-cyan-100 placeholder-cyan-400"
                />
                <Button type="submit" size="icon" variant="ghost" className="text-cyan-400 hover:text-cyan-300" aria-label="Submit search">
                  <Search className="h-4 w-4" aria-hidden="true" />
                </Button>
              </form>
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 relative rounded-full border border-cyan-500/20" aria-label="Notifications">
                <Bell className="h-5 w-5" aria-hidden="true" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-pink-500" aria-hidden="true"></span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 bg-gray-800 border border-cyan-500">
              <Card className="bg-transparent border-none">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-cyan-500/30">
                  <CardTitle className="text-sm font-medium text-cyan-300">Notifications</CardTitle>
                  <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-cyan-400 hover:text-cyan-300">
                    Mark all as read
                  </Button>
                </CardHeader>
                <CardContent className="max-h-[300px] overflow-auto py-2">
                  <ScrollArea className="h-[300px]">
                    {notifications.map((notification) => (
                      <div key={notification.id} className={`mb-4 p-2 rounded-lg ${notification.read ? 'bg-gray-700' : 'bg-cyan-900'}`}>
                        <p className="text-sm text-cyan-100">{notification.message}</p>
                      </div>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="h-10 w-10 rounded-full p-0 bg-gradient-to-br from-cyan-500 via-pink-500 to-yellow-500 hover:from-cyan-400 hover:via-pink-400 hover:to-yellow-400 transition-all duration-300">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="/placeholder-avatar.jpg" alt="User avatar" />
                  <AvatarFallback>
                    <GamepadIcon className="h-6 w-6 text-gray-900" aria-hidden="true" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 bg-gray-800 border border-cyan-500">
              <div className="grid gap-4">
                <Button variant="ghost" className="w-full justify-start text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/50 border border-cyan-500/20">
                  <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
                  Sign In
                </Button>
                <Button variant="ghost" className="w-full justify-start text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/50 border border-cyan-500/20">
                  <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Register
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <Button className="hidden md:flex bg-cyan-500 hover:bg-cyan-600 text-white font-semibold shadow-lg shadow-cyan-500/50 transition-all duration-300 transform hover:scale-105">
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            Download App
          </Button>
          <Button className="md:hidden" variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu">
            <Menu className="h-6 w-6 text-cyan-400" aria-hidden="true" />
          </Button>
        </div>
      </div>
      {isMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="md:hidden bg-gray-900 border-b border-cyan-500"
        >
          <nav className="container py-4">
            <Link href="#" className="block py-2 text-lg font-medium text-cyan-400 hover:text-cyan-300 transition-colors">Home</Link>
            <Link href="#challenges" className="block py-2 text-lg font-medium text-cyan-200 hover:text-cyan-400 transition-colors">Challenges</Link>
            <Link href="#" className="block py-2 text-lg font-medium text-cyan-200 hover:text-cyan-400 transition-colors">Community</Link>
            <Link href="#" className="block py-2 text-lg font-medium text-cyan-200 hover:text-cyan-400 transition-colors">Events</Link>
            <Link href="#" className="block py-2 text-lg font-medium text-cyan-200 hover:text-cyan-400 transition-colors">About</Link>
          </nav>
        </motion.div>
      )}
    </header>
  )
}

const Footer = () => {
  return (
    <footer className="w-full border-t border-cyan-500 bg-gray-900 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <GamepadIcon className="h-8 w-8 text-cyan-400" aria-hidden="true" />
              <span className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-pink-500 to-yellow-400">Arcadia</span>
            </Link>
            <p className="text-cyan-200 mb-4">Experience the future of gaming challenges.</p>
            <div className="flex space-x-4">
              <Link href="#" className="text-cyan-400 hover:text-cyan-300" aria-label="Twitter">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </Link>
              <Link href="#" className="text-cyan-400 hover:text-cyan-300" aria-label="GitHub">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </Link>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-cyan-400 mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="text-cyan-200 hover:text-cyan-400 transition-colors">Home</Link></li>
              <li><Link href="#challenges" className="text-cyan-200 hover:text-cyan-400 transition-colors">Challenges</Link></li>
              <li><Link href="#" className="text-cyan-200 hover:text-cyan-400 transition-colors">Community</Link></li>
              <li><Link href="#" className="text-cyan-200 hover:text-cyan-400 transition-colors">Events</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-cyan-400 mb-4">Support</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="text-cyan-200 hover:text-cyan-400 transition-colors">FAQ</Link></li>
              <li><Link href="#" className="text-cyan-200 hover:text-cyan-400 transition-colors">Contact Us</Link></li>
              <li><Link href="#" className="text-cyan-200 hover:text-cyan-400 transition-colors">Terms of Service</Link></li>
              <li><Link href="#" className="text-cyan-200 hover:text-cyan-400 transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-cyan-400 mb-4">Connect</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="text-cyan-200 hover:text-cyan-400 transition-colors">Discord</Link></li>
              <li><Link href="#" className="text-cyan-200 hover:text-cyan-400 transition-colors">YouTube</Link></li>
              <li><Link href="#" className="text-cyan-200 hover:text-cyan-400 transition-colors">Twitch</Link></li>
              <li><Link href="#" className="text-cyan-200 hover:text-cyan-400 transition-colors">Instagram</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-cyan-500/30 text-center">
          <p className="text-cyan-200">© 2023 Arcadia. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

const NeonText = ({ children, className = "" }) => (
  <span className={`text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-500 to-yellow-400 ${className}`}>
    {children}
  </span>
)

const NeonBorder = ({ children, className = "", color = "cyan" }) => (
  <div className={`relative ${className}`}>
    <div className={`absolute inset-0 bg-gradient-to-r from-${color}-500 via-pink-500 to-yellow-500 rounded-lg opacity-75 blur-sm`}></div>
    <div className="relative bg-gray-800 rounded-lg p-0.5">
      {children}
    </div>
  </div>
)

const ArcadeDecoration = ({ className = "" }) => (
  <div className={`absolute pointer-events-none ${className}`} aria-hidden="true">
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" stroke="url(#arcade-gradient)" strokeWidth="2" strokeOpacity="0.3" />
      <path d="M50 10V90M10 50H90" stroke="url(#arcade-gradient)" strokeWidth="2" strokeOpacity="0.3" />
      <defs>
        <linearGradient id="arcade-gradient" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#06b6d4" />
          <stop offset="0.5" stopColor="#ec4899" />
          <stop offset="1" stopColor="#facc15" />
        </linearGradient>
      </defs>
    </svg>
  </div>
)

const FeaturedGamesCarousel = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([])

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi])

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi, setSelectedIndex])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    setScrollSnaps(emblaApi.scrollSnapList())
    emblaApi.on('select', onSelect)
    return () => emblaApi.off('select', onSelect)
  }, [emblaApi, onSelect])

  const featuredGames = [
    { title: "Neon Racer", image: "/placeholder.svg", description: "High-speed racing in a neon-lit cyberpunk city" },
    { title: "Quantum Quest", image: "/placeholder.svg", description: "Mind-bending puzzles in a quantum realm" },
    { title: "Stellar Siege", image: "/placeholder.svg", description: "Epic space battles across the galaxy" },
    { title: "Chrono Clash", image: "/placeholder.svg", description: "Time-traveling strategy game" },
  ]

  return (
    <div className="relative">
      <NeonBorder className="overflow-hidden">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {featuredGames.map((game, index) => (
              <div className="flex-[0_0_100%] min-w-0 pl-4" key={index}>
                <Card className="bg-gray-800 border-none transition-transform duration-300 hover:scale-105">
                  <CardContent className="p-4">
                    <div className="aspect-video mb-4 overflow-hidden rounded-lg">
                      <Image
                        src={game.image}
                        alt={game.title}
                        width={640}
                        height={360}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="text-2xl font-bold text-cyan-300 mb-2">{game.title}</h3>
                    <p className="text-cyan-100">{game.description}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </NeonBorder>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-gray-800/50 text-cyan-400 hover:bg-cyan-500/20 rounded-full border border-cyan-500/20"
        onClick={scrollPrev}
        aria-label="Previous game"
      >
        <ChevronLeft className="h-6 w-6" aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-gray-800/50 text-cyan-400 hover:bg-cyan-500/20 rounded-full border border-cyan-500/20"
        onClick={scrollNext}
        aria-label="Next game"
      >
        <ChevronRight className="h-6 w-6" aria-hidden="true" />
      </Button>
    </div>
  )
}

export function LandingPageComponent() {
  const [currentChallenge, setCurrentChallenge] = useState(0)
  const [selectedChallenge, setSelectedChallenge] = useState<number | null>(null)
  const challenges = [
    {
      name: "Bingo Battles",
      icon: Grid,
      description: "Create and play custom bingo boards based on your favorite games.",
      details: "Compete against friends or join global tournaments. Customize your boards, set win conditions, and race against the clock in this exciting twist on classic bingo.",
      keyFeatures: [
        "Customizable bingo boards",
        "Real-time multiplayer",
        "Global tournaments",
        "Unique win conditions"
      ],
      difficulty: "Easy to Medium",
      estimatedTime: "15-30 minutes per game"
    },
    {
      name: "Speed Runs",
      icon: Zap,
      description: "Race against the clock in timed challenges across various games.",
      details: "Test your skills and efficiency as you attempt to complete game objectives in record time. Compete on global leaderboards and discover new strategies to shave off those precious seconds.",
      keyFeatures: [
        "Multiple game categories",
        "Global leaderboards",
        "Strategy sharing",
        "Personal best tracking"
      ],
      difficulty: "Medium to Hard",
      estimatedTime: "Varies by game"
    },
    {
      name: "Achievement Hunt",
      icon: Trophy,
      description: "Compete to unlock the most achievements across multiple games.",
      details: "Embark on a quest to become the ultimate completionist. Track your progress, discover hidden achievements, and climb the ranks as you showcase your gaming prowess across a wide range of titles.",
      keyFeatures: [
        "Cross-game achievement tracking",
        "Hidden achievement challenges",
        "Completionist leaderboards",
        "Achievement guides and tips"
      ],
      difficulty: "Varies",
      estimatedTime: "Ongoing"
    },
    {
      name: "Puzzle Quests",
      icon: Puzzle,
      description: "Solve intricate puzzles and riddles inspired by your favorite games.",
      details: "Put your problem-solving skills to the test with mind-bending puzzles and riddles. From logic challenges to visual conundrums, these quests will push your cognitive abilities to their limits.",
      keyFeatures: [
        "Diverse puzzle types",
        "Progressive difficulty",
        "Community-created puzzles",
        "Daily challenges"
      ],
      difficulty: "Easy to Expert",
      estimatedTime: "5-30 minutes per puzzle"
    }
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentChallenge((prev) => (prev + 1) % challenges.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const toggleSelectedChallenge = (index: number) => {
    setSelectedChallenge(selectedChallenge === index ? null : index)
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-gray-100">
      <Header />
      <main className="flex-grow">
        <section className="relative overflow-hidden py-20 md:py-32">
          <ArcadeDecoration className="top-10 left-10 opacity-10" />
          <ArcadeDecoration className="bottom-10 right-10 opacity-10" />
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="md:w-1/2">
                <motion.h1 
                  className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight"
                  initial={{ opacity: 0, y: -50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  Welcome to <NeonText>Arcadia</NeonText>
                </motion.h1>
                <motion.p 
                  className="text-xl md:text-2xl text-cyan-200 mb-8 leading-relaxed"
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  Experience the thrill of gaming with innovative challenges
                </motion.p>
                <motion.div
                  className="flex flex-col sm:flex-row gap-4"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <Button className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-600 text-white text-lg px-8 py-3 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-500/50">
                    <Play className="mr-2 h-5 w-5" aria-hidden="true" />
                    Start Playing
                  </Button>
                  <Button variant="ghost" className="w-full sm:w-auto text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 text-lg px-8 py-3 rounded-full transition-all duration-300 transform hover:scale-105 border border-cyan-500/20">
                    <Users className="mr-2 h-5 w-5" aria-hidden="true" />
                    Join Community
                  </Button>
                </motion.div>
              </div>
              <motion.div
                className="md:w-1/2"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <NeonBorder className="p-0.5">
                  <div className="bg-gray-800 rounded-lg overflow-hidden">
                    <Image
                      src="/placeholder.svg"
                      alt="Arcadia Gameplay"
                      width={600}
                      height={400}
                      className="w-full h-auto"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
                    <div className="absolute bottom-4 left-4 right-4 text-center">
                      <h2 className="text-2xl md:text-3xl font-bold mb-2">
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={currentChallenge}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                          >
                            <NeonText>{challenges[currentChallenge].name}</NeonText>
                          </motion.span>
                        </AnimatePresence>
                      </h2>
                      <p className="text-cyan-200 text-lg">Challenge yourself and others</p>
                    </div>
                  </div>
                </NeonBorder>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-12">
              <NeonText>Featured Games</NeonText>
            </h2>
            <FeaturedGamesCarousel />
          </div>
        </section>

        <section id="challenges" className="py-20 bg-gray-800">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-12">
              <NeonText>Featured Challenges</NeonText>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {challenges.map((challenge, index) => (
                <motion.div
                  key={challenge.name}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.5, delay: index * 0.1 }
                  }}
                >
                  <NeonBorder color={index % 2 === 0 ? "cyan" : "pink"}>
                    <Card 
                      className={`bg-gray-800 border-none h-full cursor-pointer transition-all duration-300 hover:scale-105 ${selectedChallenge === index ? 'shadow-lg shadow-cyan-500/50' : ''}`}
                      onClick={() => toggleSelectedChallenge(index)}
                    >
                      <CardHeader className="flex flex-col items-center p-4">
                        <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 via-pink-500 to-yellow-500 flex items-center justify-center mb-4 transition-transform duration-300 ${selectedChallenge === index ? 'scale-110' : ''}`}>
                          {challenge.icon && <challenge.icon className="h-8 w-8 text-white" aria-hidden="true" />}
                        </div>
                        <CardTitle className="text-2xl font-bold text-center text-cyan-300">{challenge.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <p className="text-cyan-100 text-center">{challenge.description}</p>
                      </CardContent>
                    </Card>
                  </NeonBorder>
                </motion.div>
              ))}
            </div>
            <AnimatePresence>
              {selectedChallenge !== null && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-12"
                >
                  <NeonBorder color="yellow">
                    <Card className="bg-gray-800 border-none">
                      <CardHeader className="flex flex-row items-start justify-between p-4">
                        <div>
                          <CardTitle className="text-3xl font-bold text-cyan-300">{challenges[selectedChallenge].name}</CardTitle>
                          <CardDescription className="text-lg text-cyan-100 mt-2">{challenges[selectedChallenge].description}</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setSelectedChallenge(null)} className="text-cyan-400 hover:text-cyan-300 rounded-full border border-cyan-500/20" aria-label="Close challenge details">
                          <X className="h-6 w-6" aria-hidden="true" />
                        </Button>
                      </CardHeader>
                      <CardContent className="grid md:grid-cols-2 gap-8 p-4">
                        <div>
                          <h3 className="text-xl font-semibold text-cyan-300 mb-4">Challenge Details</h3>
                          <p className="text-cyan-100 mb-4 leading-relaxed">{challenges[selectedChallenge].details}</p>
                          <h4 className="text-lg font-semibold text-cyan-300 mb-2">Key Features:</h4>
                          <ul className="list-disc list-inside text-cyan-100 mb-4 space-y-2">
                            {challenges[selectedChallenge].keyFeatures.map((feature, index) => (
                              <li key={index}>{feature}</li>
                            ))}
                          </ul>
                          <div className="flex flex-wrap gap-4">
                            <div>
                              <h4 className="text-sm font-semibold text-cyan-300">Difficulty</h4>
                              <p className="text-cyan-100">{challenges[selectedChallenge].difficulty}</p>
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-cyan-300">Estimated Time</h4>
                              <p className="text-cyan-100">{challenges[selectedChallenge].estimatedTime}</p>
                            </div>
                          </div>
                        </div>
                        <div>
                          <div className="aspect-video bg-gray-700 rounded-lg overflow-hidden mb-4">
                            <Image
                              src="/placeholder.svg"
                              alt={`${challenges[selectedChallenge].name} demo`}
                              width={640}
                              height={360}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/50 transition-all duration-300 transform hover:scale-105">
                            Start Challenge
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </NeonBorder>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="mt-12 text-center">
              <Button
                variant="ghost"
                className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 text-lg px-8 py-3 rounded-full transition-all duration-300 transform hover:scale-105 border border-cyan-500/20"
              >
                Explore All Challenges
                <ChevronRight className="ml-2 h-5 w-5 inline-block" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-12">
              <NeonText>Upcoming Events</NeonText>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { name: "Bingo Blitz Tournament", date: "June 15, 2023", description: "Compete in our biggest Bingo Battles event of the year!" },
                { name: "Speed Run Challenge", date: "July 1, 2023", description: "Test your skills in a multi-game speed running competition." },
                { name: "Puzzle Masters Showdown", date: "July 20, 2023", description: "Solve complex puzzles and riddles in this brain-teasing event." }
              ].map((event, index) => (
                <motion.div
                  key={event.name}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <NeonBorder color={index === 0 ? "cyan" : index === 1 ? "pink" : "yellow"}>
                    <Card className="bg-gray-800 border-none h-full transition-all duration-300 hover:scale-105">
                      <CardHeader className="p-4">
                        <CardTitle className="text-xl font-bold text-cyan-300">{event.name}</CardTitle>
                        <CardDescription className="text-cyan-100">
                          <Calendar className="inline-block mr-2 h-4 w-4" aria-hidden="true" />
                          {event.date}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4">
                        <p className="text-cyan-100">{event.description}</p>
                      </CardContent>
                      <CardFooter className="p-4">
                        <Button variant="ghost" className="w-full text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 transition-all duration-300 transform hover:scale-105 border border-cyan-500/20">
                          View Event Details
                        </Button>
                      </CardFooter>
                    </Card>
                  </NeonBorder>
                </motion.div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Button variant="ghost" className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 transition-all duration-300 transform hover:scale-105 border border-cyan-500/20">
                View All Events
                <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </section>

        <section className="py-20 bg-gray-800">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-12">
              <NeonText>Join the Community</NeonText>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <NeonBorder color="cyan">
                <Card className="bg-gray-800 border-none h-full transition-all duration-300 hover:scale-105">
                  <CardHeader className="p-4">
                    <CardTitle className="text-2xl font-bold text-cyan-300">Discord Server</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <p className="text-cyan-100 mb-4">Connect with other players, join voice chats, and stay updated on the latest Arcadia news.</p>
                    <Button className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white shadow-lg shadow-[#5865F2]/50 transition-all duration-300 transform hover:scale-105">
                      Join our Discord
                    </Button>
                  </CardContent>
                </Card>
              </NeonBorder>
              <NeonBorder color="pink">
                <Card className="bg-gray-800 border-none h-full transition-all duration-300 hover:scale-105">
                  <CardHeader className="p-4">
                    <CardTitle className="text-2xl font-bold text-cyan-300">Arcadia Forums</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <p className="text-cyan-100 mb-4">Discuss strategies, share your achievements, and participate in community events.</p>
                    <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/50 transition-all duration-300 transform hover:scale-105">
                      Explore Forums
                    </Button>
                  </CardContent>
                </Card>
              </NeonBorder>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-8">
              <NeonText>Ready to Join the Gaming Revolution?</NeonText>
            </h2>
            <p className="text-xl text-cyan-100 mb-12 max-w-2xl mx-auto leading-relaxed">Experience innovative challenges, connect with gamers worldwide, and become part of the Arcadia community. Your gaming adventure starts here!</p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <Button className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-600 text-white text-lg px-8 py-3 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-500/50">
                <Download className="mr-2 h-5 w-5" aria-hidden="true" />
                Download Arcadia
              </Button>
              <Button variant="ghost" className="w-full sm:w-auto text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 text-lg px-8 py-3 rounded-full transition-all duration-300 transform hover:scale-105 border border-cyan-500/20">
                <Play className="mr-2 h-5 w-5" aria-hidden="true" />
                Play in Browser
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}