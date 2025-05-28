'use client';

import React, { useState } from 'react';
import { Trophy, Grid, Zap, Puzzle } from 'lucide-react';
import { BingoBoards } from '@/features/bingo-boards/components/BingoBoards';
import { SpeedRuns } from '@/features/speedruns/SpeedRuns';
import { AchievementHunt } from '@/features/achievement-hunt/AchievementHunt';
import { PuzzleQuests } from '@/features/puzzle-quests/PuzzleQuests';
import { cn } from '@/lib/utils';

export default function Challenges() {
  const [activeTab, setActiveTab] = useState('bingo');

  const renderContent = () => {
    switch (activeTab) {
      case 'bingo':
        return <BingoBoards />;
      case 'speedrun':
        return <SpeedRuns />;
      case 'achievements':
        return <AchievementHunt />;
      case 'puzzles':
        return <PuzzleQuests />;
      default:
        return <BingoBoards />;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-gray-100">
      <main className="container mx-auto max-w-7xl flex-grow px-4 sm:px-6 lg:px-8">
        {/* Navigation Tabs - flex-col auf Mobile, flex-row auf Desktop */}
        <div className="mb-8 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => setActiveTab('bingo')}
            className={cn(
              'flex items-center justify-between rounded-md px-4 py-3 sm:py-2',
              'w-full transition-all duration-200 ease-in-out',
              activeTab === 'bingo'
                ? 'border border-cyan-500/30 bg-cyan-500/20 text-cyan-300'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-800/80 hover:text-cyan-300'
            )}
          >
            <span className="font-medium">Bingo Boards</span>
            <Grid className="ml-2 h-5 w-5" />
          </button>

          <button
            onClick={() => setActiveTab('speedrun')}
            className={cn(
              'flex items-center justify-between rounded-md px-4 py-3 sm:py-2',
              'w-full transition-all duration-200 ease-in-out',
              activeTab === 'speedrun'
                ? 'border border-cyan-500/30 bg-cyan-500/20 text-cyan-300'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-800/80 hover:text-cyan-300'
            )}
          >
            <span className="font-medium">Speed Runs</span>
            <Zap className="ml-2 h-5 w-5" />
          </button>

          <button
            onClick={() => setActiveTab('achievements')}
            className={cn(
              'flex items-center justify-between rounded-md px-4 py-3 sm:py-2',
              'w-full transition-all duration-200 ease-in-out',
              activeTab === 'achievements'
                ? 'border border-cyan-500/30 bg-cyan-500/20 text-cyan-300'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-800/80 hover:text-cyan-300'
            )}
          >
            <span className="font-medium">Achievement Hunt</span>
            <Trophy className="ml-2 h-5 w-5" />
          </button>

          <button
            onClick={() => setActiveTab('puzzles')}
            className={cn(
              'flex items-center justify-between rounded-md px-4 py-3 sm:py-2',
              'w-full transition-all duration-200 ease-in-out',
              activeTab === 'puzzles'
                ? 'border border-cyan-500/30 bg-cyan-500/20 text-cyan-300'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-800/80 hover:text-cyan-300'
            )}
          >
            <span className="font-medium">Puzzle Quests</span>
            <Puzzle className="ml-2 h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        {renderContent()}
      </main>
    </div>
  );
}
