'use client'

import React, { useState, useMemo } from 'react'
import { Trophy, Grid, Zap, Puzzle } from 'lucide-react'
import { BingoBoards } from './sections/BingoBoards/BingoBoards'
import { SpeedRuns } from './sections/Speedruns/SpeedRuns'
import { AchievementHunt } from './sections/AchievementHunt/AchievementHunt'
import { PuzzleQuests } from './sections/PuzzleQuests/PuzzleQuests'
import type { Challenge, ChallengeSection } from './types'
import { ChallengesTabs } from './ChallengesTabs'

const CHALLENGES: Challenge[] = [
  {
    id: 'bingo',
    name: 'Bingo Boards',
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
    disabled: false,
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
    disabled: false,
  },
  {
    id: 'puzzles',
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
    disabled: false,
  },
]

const SECTIONS: Record<string, ChallengeSection> = {
  bingo: {
    id: 'bingo',
    component: BingoBoards,
    path: '/challangehub/bingo-boards'
  },
  speedrun: {
    id: 'speedrun',
    component: SpeedRuns,
    path: '/challangehub/speedruns'
  },
  achievements: {
    id: 'achievements',
    component: AchievementHunt,
    path: '/challangehub/achievements'
  },
  puzzles: {
    id: 'puzzles',
    component: PuzzleQuests,
    path: '/challangehub/puzzle-quests'
  }
}

export default function Challenges() {
  const [activeChallenge, setActiveChallenge] = useState<Challenge['id']>('bingo')

  const currentSection = useMemo(() => {
    const section = SECTIONS[activeChallenge]
    if (!section) return null

    const SectionComponent = section.component
    return <SectionComponent />
  }, [activeChallenge])

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-gray-100">
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <ChallengesTabs
          challenges={CHALLENGES}
          activeChallenge={activeChallenge}
          onChallengeChange={setActiveChallenge}
        />
        {currentSection}
      </main>
    </div>
  )
}