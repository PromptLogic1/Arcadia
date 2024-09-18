'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useEmblaCarousel from 'embla-carousel-react'
import Image from 'next/image'
import {
  Play,
  Grid,
  Zap,
  Trophy,
  Puzzle,
  ChevronRight,
  ChevronLeft,
  Users,
  X,
} from 'lucide-react'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import NeonText from '@/components/ui/NeonText'

interface NeonBorderProps {
  children: React.ReactNode
  className?: string
  color?: 'cyan' | 'pink' | 'yellow'
}

const NeonBorder: React.FC<NeonBorderProps> = ({
  children,
  className = '',
  color = 'cyan',
}) => {
  const colorClasses: Record<'cyan' | 'pink' | 'yellow', string> = {
    cyan: 'from-cyan-500',
    pink: 'from-pink-500',
    yellow: 'from-yellow-500',
  }
  return (
    <div className={`relative ${className}`}>
      <div
        className={`absolute inset-0 bg-gradient-to-r ${
          colorClasses[color]
        } via-pink-500 to-yellow-500 rounded-lg opacity-75 blur-sm`}
      ></div>
      <div className="relative bg-gray-800 rounded-lg p-0.5">{children}</div>
    </div>
  )
}

interface ArcadeDecorationProps {
  className?: string
}

const ArcadeDecoration: React.FC<ArcadeDecorationProps> = ({
  className = '',
}) => (
  <div
    className={`absolute pointer-events-none ${className}`}
    aria-hidden="true"
  >
    <svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="50"
        cy="50"
        r="45"
        stroke="url(#arcade-gradient)"
        strokeWidth="2"
        strokeOpacity="0.3"
      />
      <path
        d="M50 10V90M10 50H90"
        stroke="url(#arcade-gradient)"
        strokeWidth="2"
        strokeOpacity="0.3"
      />
      <defs>
        <linearGradient
          id="arcade-gradient"
          x1="0"
          y1="0"
          x2="100"
          y2="100"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#06b6d4" />
          <stop offset="0.5" stopColor="#ec4899" />
          <stop offset="1" stopColor="#facc15" />
        </linearGradient>
      </defs>
    </svg>
  </div>
)

const FeaturedGamesCarousel: React.FC = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true })
  const [selectedIndex, setSelectedIndex] = useState<number>(0)

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi, onSelect])

  const featuredGames = [
    {
      title: 'World of Warcraft',
      image: '/placeholder.svg',
      description: 'Embark on epic quests in a vast fantasy world.',
    },
    {
      title: 'Elden Ring',
      image: '/placeholder.svg',
      description: 'Explore a sprawling realm filled with mystery and peril.',
    },
    {
      title: 'Cyberpunk 2077',
      image: '/placeholder.svg',
      description: 'Dive into a dystopian future teeming with cybernetic intrigue.',
    },
    {
      title: 'Fortnite',
      image: '/placeholder.svg',
      description: 'Battle it out in this wildly popular survival game.',
    },
    {
      title: 'The Witcher 3',
      image: '/placeholder.svg',
      description: 'Become a monster slayer in a land of magic and folklore.',
    },
  ]

  return (
    <div className="relative">
      <NeonBorder className="overflow-hidden">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex -mx-2">
            {featuredGames.map((game, index) => (
              <div
                className="flex-shrink-0 w-full sm:w-1/2 md:w-1/3 lg:w-1/4 px-2"
                key={index}
              >
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
                    <h3 className="text-2xl font-bold text-cyan-300 mb-2">
                      {game.title}
                    </h3>
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
        className="absolute top-1/2 left-2 transform -translate-y-1/2 bg-gray-800/50 text-cyan-400 hover:bg-cyan-500/20 rounded-full border border-cyan-500/20"
        onClick={scrollPrev}
        aria-label="Previous Game"
      >
        <ChevronLeft className="h-6 w-6" aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-gray-800/50 text-cyan-400 hover:bg-cyan-500/20 rounded-full border border-cyan-500/20"
        onClick={scrollNext}
        aria-label="Next Game"
      >
        <ChevronRight className="h-6 w-6" aria-hidden="true" />
      </Button>
    </div>
  )
}

interface Partner {
  name: string
  logoUrl: string
  website: string
}

const partners: Partner[] = [
  {
    name: 'Partner One',
    logoUrl: '/partners/partner1.png',
    website: 'https://partnerone.com',
  },
  {
    name: 'Partner Two',
    logoUrl: '/partners/partner2.png',
    website: 'https://partnertwo.com',
  },
  {
    name: 'Partner Three',
    logoUrl: '/partners/partner3.png',
    website: 'https://partnerthree.com',
  },
  {
    name: 'Partner Four',
    logoUrl: '/partners/partner4.png',
    website: 'https://partnerfour.com',
  },
]

const PartnersSection: React.FC = () => (
  <section className="py-20 bg-gray-800 text-gray-100">
    <div className="container mx-auto px-4">
      <h2 className="text-4xl md:text-5xl font-bold text-center mb-12">
        <NeonText>Our Partners</NeonText>
      </h2>
      <div className="flex flex-wrap justify-center items-center gap-8">
        {partners.map((partner, index) => (
          <a
            key={index}
            href={partner.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-32 h-16 bg-gray-700 rounded-lg hover:scale-105 transition-transform duration-300"
            aria-label={`Visit ${partner.name}`}
          >
            <Image
              src={partner.logoUrl}
              alt={`${partner.name} Logo`}
              width={150}
              height={50}
              className="object-contain"
            />
          </a>
        ))}
      </div>
    </div>
  </section>
)

interface Event {
  title: string
  date: string
  description: string
  imageUrl: string
}

const upcomingEvents: Event[] = [
  {
    title: 'Arcadia Tournament 2024',
    date: 'June 15, 2024',
    description: 'Join our annual tournament and compete with top gamers worldwide.',
    imageUrl: '/events/tournament2024.jpg',
  },
  {
    title: 'Live Stream Marathon',
    date: 'July 10, 2024',
    description: 'Watch live streams from your favorite gamers and participate in giveaways.',
    imageUrl: '/events/streammarathon.jpg',
  },
  {
    title: 'Developer Meetup',
    date: 'August 20, 2024',
    description: 'Meet the developers behind Arcadia and share your feedback.',
    imageUrl: '/events/developermeetup.jpg',
  },
]

const UpcomingEventsSection: React.FC = () => (
  <section className="py-20 bg-gray-900 text-gray-100">
    <div className="container mx-auto px-4">
      <h2 className="text-4xl md:text-5xl font-bold text-center mb-12">
        <NeonText>Upcoming Events</NeonText>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {upcomingEvents.map((event, index) => (
          <Card key={index} className="bg-gray-800 border-none hover:scale-105 transition-transform duration-300">
            <CardHeader className="p-0">
              <div className="relative h-48">
                <Image
                  src={event.imageUrl}
                  alt={event.title}
                  fill
                  className="object-cover rounded-t-lg"
                />
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <CardTitle className="text-2xl font-bold text-cyan-300 mb-2">
                {event.title}
              </CardTitle>
              <p className="text-cyan-100 mb-2">{event.date}</p>
              <p className="text-cyan-100">{event.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </section>
)

interface Challenge {
  name: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  details: string
  keyFeatures: string[]
  difficulty: string
  estimatedTime: string
}

const LandingPage: React.FC = () => {
  const [currentChallenge, setCurrentChallenge] = useState<number>(0)
  const [selectedChallenge, setSelectedChallenge] = useState<number | null>(null)
  const { setTheme } = useTheme()

  const challenges: Challenge[] = [
    {
      name: 'Bingo Battles',
      icon: Grid,
      description:
        'Create and play custom bingo boards based on your favorite games.',
      details:
        'Compete against friends or join global tournaments. Customize your boards, set win conditions, and race against the clock in this exciting twist on classic bingo.',
      keyFeatures: [
        'Customizable bingo boards',
        'Real-time multiplayer',
        'Global tournaments',
        'Unique win conditions',
      ],
      difficulty: 'Easy to Medium',
      estimatedTime: '15-30 minutes per game',
    },
    {
      name: 'Speed Runs',
      icon: Zap,
      description:
        'Race against the clock in timed challenges across various games.',
      details:
        'Test your skills and efficiency as you attempt to complete game objectives in record time. Compete on global leaderboards and discover new strategies to shave off those precious seconds.',
      keyFeatures: [
        'Multiple game categories',
        'Global leaderboards',
        'Strategy sharing',
        'Personal best tracking',
      ],
      difficulty: 'Medium to Hard',
      estimatedTime: 'Varies by game',
    },
    {
      name: 'Achievement Hunt',
      icon: Trophy,
      description:
        'Compete to unlock the most achievements across multiple games.',
      details:
        'Embark on a quest to become the ultimate completionist. Track your progress, discover hidden achievements, and climb the ranks as you showcase your gaming prowess across a wide range of titles.',
      keyFeatures: [
        'Cross-game achievement tracking',
        'Hidden achievement challenges',
        'Completionist leaderboards',
        'Achievement guides and tips',
      ],
      difficulty: 'Varies',
      estimatedTime: 'Ongoing',
    },
    {
      name: 'Puzzle Quests',
      icon: Puzzle,
      description:
        'Solve intricate puzzles and riddles inspired by your favorite games.',
      details:
        'Put your problem-solving skills to the test with mind-bending puzzles and riddles. From logic challenges to visual conundrums, these quests will push your cognitive abilities to their limits.',
      keyFeatures: [
        'Diverse puzzle types',
        'Progressive difficulty',
        'Community-created puzzles',
        'Daily challenges',
      ],
      difficulty: 'Easy to Expert',
      estimatedTime: '5-30 minutes per puzzle',
    },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentChallenge((prev) => (prev + 1) % challenges.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [challenges.length])

  const toggleSelectedChallenge = (index: number) => {
    setSelectedChallenge(selectedChallenge === index ? null : index)
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-gray-100">
      <main className="flex-grow">
        <section className="relative overflow-hidden py-20 md:py-32" id="home">
          <ArcadeDecoration className="top-10 left-10 opacity-10" />
          <ArcadeDecoration className="bottom-10 right-10 opacity-10" />
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="w-full md:w-1/2">
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
                  <Button
                    variant="ghost"
                    className="w-full sm:w-auto text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 text-lg px-8 py-3 rounded-full transition-all duration-300 transform hover:scale-105 border border-cyan-500/20"
                  >
                    <Users className="mr-2 h-5 w-5" aria-hidden="true" />
                    Join Community
                  </Button>
                </motion.div>
              </div>
              <motion.div
                className="w-full md:w-1/2"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <NeonBorder className="p-0.5">
                  <div className="bg-gray-800 rounded-lg overflow-hidden relative">
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
                      <p className="text-cyan-200 text-lg">
                        Challenge yourself and others
                      </p>
                    </div>
                  </div>
                </NeonBorder>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-20" id="games">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {challenges.map((challenge, index) => (
                <motion.div
                  key={challenge.name}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.5, delay: index * 0.1 },
                  }}
                >
                  <NeonBorder color={index % 2 === 0 ? 'cyan' : 'pink'}>
                    <Card
                      className={`bg-gray-800 border-none h-full cursor-pointer transition-transform duration-300 hover:scale-105 ${
                        selectedChallenge === index ? 'shadow-lg shadow-cyan-500/50' : ''
                      }`}
                      onClick={() => toggleSelectedChallenge(index)}
                    >
                      <CardHeader className="flex flex-col items-center p-4">
                        <div
                          className={`w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 via-pink-500 to-yellow-500 flex items-center justify-center mb-4 transition-transform duration-300 ${
                            selectedChallenge === index ? 'scale-110' : ''
                          }`}
                        >
                          {challenge.icon && (
                            <challenge.icon className="h-8 w-8 text-white" aria-hidden="true" />
                          )}
                        </div>
                        <CardTitle className="text-2xl font-bold text-center text-cyan-300">
                          {challenge.name}
                        </CardTitle>
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
                          <CardTitle className="text-3xl font-bold text-cyan-300">
                            {challenges[selectedChallenge].name}
                          </CardTitle>
                          <CardDescription className="text-lg text-cyan-100 mt-2">
                            {challenges[selectedChallenge].description}
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedChallenge(null)}
                          className="text-cyan-400 hover:text-cyan-300 rounded-full border border-cyan-500/20"
                          aria-label="Close challenge details"
                        >
                          <X className="h-6 w-6" aria-hidden="true" />
                        </Button>
                      </CardHeader>
                      <CardContent className="grid md:grid-cols-2 gap-8 p-4">
                        <div>
                          <h3 className="text-xl font-semibold text-cyan-300 mb-4">
                            Challenge Details
                          </h3>
                          <p className="text-cyan-100 mb-4 leading-relaxed">
                            {challenges[selectedChallenge].details}
                          </p>
                          <h4 className="text-lg font-semibold text-cyan-300 mb-2">
                            Key Features:
                          </h4>
                          <ul className="list-disc list-inside text-cyan-100 mb-4 space-y-2">
                            {challenges[selectedChallenge].keyFeatures.map(
                              (feature, index) => (
                                <li key={index}>{feature}</li>
                              )
                            )}
                          </ul>
                          <div className="flex flex-wrap gap-4">
                            <div>
                              <h4 className="text-sm font-semibold text-cyan-300">
                                Difficulty
                              </h4>
                              <p className="text-cyan-100">
                                {challenges[selectedChallenge].difficulty}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-cyan-300">
                                Estimated Time
                              </h4>
                              <p className="text-cyan-100">
                                {challenges[selectedChallenge].estimatedTime}
                              </p>
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

        <PartnersSection />

        <UpcomingEventsSection />

        <section className="py-20 bg-gray-900 text-gray-100">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-12">
              <NeonText>Frequently Asked Questions</NeonText>
            </h2>
            <Accordion type="single" collapsible>
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`faq-${index}`}>
                  <AccordionTrigger className="text-xl font-semibold">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-cyan-100">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </main>
    </div>
  )
}

const faqs = [
  {
    question: 'What is Arcadia?',
    answer:
      'Arcadia is a gaming platform offering innovative challenges and experiences.',
  },
  {
    question: 'How can I join the community?',
    answer:
      'You can join our community by signing up on our website and participating in forums and events.',
  },
  {
    question: 'Is Arcadia free to use?',
    answer:
      'Yes, Arcadia offers a range of free challenges and games. Premium content is also available.',
  },
]

export default LandingPage