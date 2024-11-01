'use client'

import React, { useState } from 'react'
import { Gamepad2, Dice5, Trophy, Target, Grid, Zap, Puzzle } from 'lucide-react'
import { ChallengesTabs } from './challenges/ChallengesTabs'
import BingoBattles from './challenges/bingo-board/bingo-battles'

const CHALLENGES = [
  {
    id: 'bingo',
    name: 'Bingo Battles',
    description: 'Create and play custom bingo boards',
    icon: <Grid className="w-6 h-6" />,
  },
  {
    id: 'speedrun',
    name: 'Speed Runs',
    description: 'Race against the clock in timed challenges',
    icon: <Zap className="w-6 h-6" />,
    disabled: true,
  },
  {
    id: 'achievements',
    name: 'Achievement Hunt',
    description: 'Collaborative achievement tracking',
    icon: <Trophy className="w-6 h-6" />,
    disabled: true,
  },
  {
    id: 'custom',
    name: 'Puzzle Quests',
    description: 'Solve intricate puzzles and riddles',
    icon: <Puzzle className="w-6 h-6" />,
    disabled: true,
  },
]

export default function Challenges() {
  const [activeChallenge, setActiveChallenge] = useState('bingo')

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <ChallengesTabs
        challenges={CHALLENGES}
        activeChallenge={activeChallenge}
        onChallengeChange={setActiveChallenge}
      />
      
      {activeChallenge === 'bingo' && <BingoBattles />}
      
      {/* Add other challenge components here when they're ready */}
    </div>
  )
}
