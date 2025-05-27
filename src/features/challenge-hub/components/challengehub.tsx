'use client'

import React, { useState } from 'react'
import { Trophy, Grid, Zap, Puzzle } from 'lucide-react'
import { BingoBoards } from '@/src/features/bingo-boards/components/BingoBoards'
import { SpeedRuns } from '@/src/features/Speedruns/SpeedRuns'
import { AchievementHunt } from '@/src/features/AchievementHunt/AchievementHunt'
import { PuzzleQuests } from '@/src/features/PuzzleQuests/PuzzleQuests'
import { cn } from "@/lib/utils"

export default function Challenges() {
  const [activeTab, setActiveTab] = useState('bingo')

  const renderContent = () => {
    switch (activeTab) {
      case 'bingo': return <BingoBoards />
      case 'speedrun': return <SpeedRuns />
      case 'achievements': return <AchievementHunt />
      case 'puzzles': return <PuzzleQuests />
      default: return <BingoBoards />
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-gray-100">
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Navigation Tabs - flex-col auf Mobile, flex-row auf Desktop */}
        <div className="flex flex-col sm:flex-row gap-2 mb-8">
          <button
            onClick={() => setActiveTab('bingo')}
            className={cn(
              "flex items-center justify-between px-4 py-3 sm:py-2 rounded-md",
              "transition-all duration-200 ease-in-out w-full",
              activeTab === 'bingo'
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                : "bg-gray-800/50 hover:bg-gray-800/80 text-gray-300 hover:text-cyan-300"
            )}
          >
            <span className="font-medium">Bingo Boards</span>
            <Grid className="w-5 h-5 ml-2" />
          </button>

          <button
            onClick={() => setActiveTab('speedrun')}
            className={cn(
              "flex items-center justify-between px-4 py-3 sm:py-2 rounded-md",
              "transition-all duration-200 ease-in-out w-full",
              activeTab === 'speedrun'
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                : "bg-gray-800/50 hover:bg-gray-800/80 text-gray-300 hover:text-cyan-300"
            )}
          >
            <span className="font-medium">Speed Runs</span>
            <Zap className="w-5 h-5 ml-2" />
          </button>

          <button
            onClick={() => setActiveTab('achievements')}
            className={cn(
              "flex items-center justify-between px-4 py-3 sm:py-2 rounded-md",
              "transition-all duration-200 ease-in-out w-full",
              activeTab === 'achievements'
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                : "bg-gray-800/50 hover:bg-gray-800/80 text-gray-300 hover:text-cyan-300"
            )}
          >
            <span className="font-medium">Achievement Hunt</span>
            <Trophy className="w-5 h-5 ml-2" />
          </button>

          <button
            onClick={() => setActiveTab('puzzles')}
            className={cn(
              "flex items-center justify-between px-4 py-3 sm:py-2 rounded-md",
              "transition-all duration-200 ease-in-out w-full",
              activeTab === 'puzzles'
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                : "bg-gray-800/50 hover:bg-gray-800/80 text-gray-300 hover:text-cyan-300"
            )}
          >
            <span className="font-medium">Puzzle Quests</span>
            <Puzzle className="w-5 h-5 ml-2" />
          </button>
        </div>

        {/* Content */}
        {renderContent()}
      </main>
    </div>
  )
} 