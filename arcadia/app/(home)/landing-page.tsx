'use client'

import React, { useState, useEffect, Suspense } from 'react'
import LoadingSpinner from '@/components/ui/loading-spinner'
import HeroSection from '@/components/landing-page/heroSection'
import FeaturedGamesCarousel from '@/components/landing-page/FeaturedGamesCarousel'
import FeaturedChallenges from '@/components/landing-page/FeaturedChallenges'
import PartnersSection from '@/components/landing-page/PartnersSection'
import UpcomingEventsSection from '@/components/landing-page/UpcomingEventsSection'
import FAQSection from '@/components/landing-page/FAQSection'
import { Grid, Zap, Trophy, Puzzle } from 'lucide-react'
import { type Challenge } from '@/types/challenges'

const FEATURED_CHALLENGES: Challenge[] = [
  {
    id: 'bingo-battles',
    name: 'Bingo Battles',
    icon: () => <Grid className="w-6 h-6" />,
    description: 'Create and play custom bingo boards based on your favorite games.',
    details: 'Compete against friends or join global tournaments. Customize your boards, set win conditions, and race against the clock in this exciting twist on classic bingo.',
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
    id: 'speed-runs',
    name: 'Speed Runs',
    icon: () => <Zap className="w-6 h-6" />,
    description: 'Race against the clock in timed challenges across various games.',
    details: 'Test your skills and efficiency as you attempt to complete game objectives in record time. Compete on global leaderboards and discover new strategies to shave off those precious seconds.',
    keyFeatures: [
      'Multiple game categories',
      'Global leaderboards',
      'Strategy sharing',
      'Personal best tracking',
    ],
    difficulty: 'Medium to Hard',
    estimatedTime: 'Varies by game',
    disabled: true,
  },
  {
    id: 'achievement-hunt',
    name: 'Achievement Hunt',
    icon: () => <Trophy className="w-6 h-6" />,
    description: 'Compete to unlock the most achievements across multiple games.',
    details: 'Embark on a quest to become the ultimate completionist. Track your progress, discover hidden achievements, and climb the ranks as you showcase your gaming prowess across a wide range of titles.',
    keyFeatures: [
      'Cross-game achievement tracking',
      'Hidden achievement challenges',
      'Completionist leaderboards',
      'Achievement guides and tips',
    ],
    difficulty: 'Varies',
    estimatedTime: 'Ongoing',
    disabled: true,
  },
  {
    id: 'puzzle-quests',
    name: 'Puzzle Quests',
    icon: () => <Puzzle className="w-6 h-6" />,
    description: 'Solve intricate puzzles and riddles inspired by your favorite games.',
    details: 'Put your problem-solving skills to the test with mind-bending puzzles and riddles. From logic challenges to visual conundrums, these quests will push your cognitive abilities to their limits.',
    keyFeatures: [
      'Diverse puzzle types',
      'Progressive difficulty',
      'Community-created puzzles',
      'Daily challenges',
    ],
    difficulty: 'Easy to Expert',
    estimatedTime: '5-30 minutes per puzzle',
    disabled: true,
  },
] as const

const LandingPage: React.FC = () => {
  const [currentChallenge, setCurrentChallenge] = useState<number>(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentChallenge((prev) => (prev + 1) % FEATURED_CHALLENGES.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-gray-100">
      <main className="flex-grow">
        <Suspense fallback={<LoadingSpinner />}>
          <HeroSection currentChallenge={currentChallenge} challenges={FEATURED_CHALLENGES} />
        </Suspense>
        
        <Suspense fallback={<LoadingSpinner />}>
          <FeaturedGamesCarousel />
        </Suspense>
        
        <Suspense fallback={<LoadingSpinner />}>
          <FeaturedChallenges challenges={FEATURED_CHALLENGES} />
        </Suspense>
        
        <Suspense fallback={<LoadingSpinner />}>
          <PartnersSection />
        </Suspense>
        
        <Suspense fallback={<LoadingSpinner />}>
          <UpcomingEventsSection />
        </Suspense>
        
        <Suspense fallback={<LoadingSpinner />}>
          <FAQSection />
        </Suspense>
      </main>
    </div>
  )
}

export default LandingPage