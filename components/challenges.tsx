'use client'

import React, { useState, useMemo } from 'react'
import { Trophy, Grid, Zap, Puzzle } from 'lucide-react'
import { ChallengesTabs, type Challenge } from './challenges/ChallengesTabs'
import BingoBattles from './challenges/bingo-board/bingo-battles'

const CHALLENGES: Challenge[] = [
  {
    id: 'bingo',
    name: 'Bingo Battles',
    description: 'Create and play custom bingo boards',
    icon: Grid,
    details: 'Compete against friends or join global tournaments. Customize your boards, set win conditions, and race against the clock in this exciting twist on classic bingo.',
    keyFeatures: [
      'Customizable bingo boards',
      'Real-time multiplayer',
      'Global tournaments',
      'Unique win conditions',
    ],
    difficulty: 'Easy to Medium',
    estimatedTime: '15-30 minutes per game',
    disabled: false,
  },
  {
    id: 'speedrun',
    name: 'Speed Runs',
    description: 'Race against the clock in timed challenges',
    icon: Zap,
    details: 'Test your skills and efficiency as you attempt to complete game objectives in record time. Compete on global leaderboards and discover new strategies.',
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
    id: 'achievements',
    name: 'Achievement Hunt',
    description: 'Collaborative achievement tracking',
    icon: Trophy,
    details: 'Track and unlock achievements across multiple games. Compete with friends and climb the global rankings.',
    keyFeatures: [
      'Cross-game achievement tracking',
      'Hidden achievement challenges',
      'Completionist leaderboards',
      'Achievement guides',
    ],
    difficulty: 'Varies',
    estimatedTime: 'Ongoing',
    disabled: true,
  },
  {
    id: 'custom',
    name: 'Puzzle Quests',
    description: 'Solve intricate puzzles and riddles',
    icon: Puzzle,
    details: 'Challenge yourself with mind-bending puzzles and riddles inspired by your favorite games.',
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
]

export default function Challenges() {
  const [activeChallenge, setActiveChallenge] = useState<Challenge['id']>('bingo')

  const currentChallenge = useMemo(() => {
    switch (activeChallenge) {
      case 'bingo':
        return <BingoBattles />
      default:
        return null
    }
  }, [activeChallenge])

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <ChallengesTabs
        challenges={CHALLENGES}
        activeChallenge={activeChallenge}
        onChallengeChange={setActiveChallenge}
      />
      {currentChallenge}
    </div>
  )
}


