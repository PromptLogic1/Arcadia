'use client';

import React, { useState } from 'react';
import { Trophy, Grid, Zap, Puzzle } from 'lucide-react';
import BingoBoardsHub from '@/features/bingo-boards/components/BingoBoardsHub';
import { SpeedRuns } from '@/features/Speedruns/SpeedRuns';
import { AchievementHunt } from '@/features/achievement-hunt/AchievementHunt';
import { PuzzleQuests } from '@/features/puzzle-quests/PuzzleQuests';
import { cn } from '@/lib/utils';

export default function Challenges() {
  const [activeTab, setActiveTab] = useState('bingo');

  const renderContent = () => {
    switch (activeTab) {
      case 'bingo':
        return <BingoBoardsHub />;
      case 'speedrun':
        return <SpeedRuns />;
      case 'achievements':
        return <AchievementHunt />;
      case 'puzzles':
        return <PuzzleQuests />;
      default:
        return <BingoBoardsHub />;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-cyan-100">
      <main className="container mx-auto max-w-7xl flex-grow px-4 sm:px-6 lg:px-8">
        {/* Navigation Tabs - Enhanced Cyberpunk Design */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => setActiveTab('bingo')}
            className={cn(
              'cyber-card cyber-card-hover flex items-center justify-between rounded-lg px-6 py-4 sm:py-3',
              'group w-full transition-all duration-300 ease-in-out',
              activeTab === 'bingo'
                ? 'cyber-card-selected neon-glow-cyan'
                : 'hover:border-cyan-400/60'
            )}
          >
            <span className="font-semibold">Bingo Boards</span>
            <Grid
              className={cn(
                'ml-2 h-5 w-5 transition-all duration-300',
                activeTab === 'bingo'
                  ? 'text-cyan-400 drop-shadow-lg'
                  : 'group-hover:text-cyan-400'
              )}
            />
          </button>

          <button
            onClick={() => setActiveTab('speedrun')}
            className={cn(
              'cyber-card cyber-card-hover flex items-center justify-between rounded-lg px-6 py-4 sm:py-3',
              'group w-full transition-all duration-300 ease-in-out',
              activeTab === 'speedrun'
                ? 'cyber-card-selected neon-glow-purple'
                : 'hover:border-purple-400/60'
            )}
          >
            <span className="font-semibold">Speed Runs</span>
            <Zap
              className={cn(
                'ml-2 h-5 w-5 transition-all duration-300',
                activeTab === 'speedrun'
                  ? 'text-purple-400 drop-shadow-lg'
                  : 'group-hover:text-purple-400'
              )}
            />
          </button>

          <button
            onClick={() => setActiveTab('achievements')}
            className={cn(
              'cyber-card cyber-card-hover flex items-center justify-between rounded-lg px-6 py-4 sm:py-3',
              'group w-full transition-all duration-300 ease-in-out',
              activeTab === 'achievements'
                ? 'cyber-card-selected neon-glow-fuchsia'
                : 'hover:border-fuchsia-400/60'
            )}
          >
            <span className="font-semibold">Achievement Hunt</span>
            <Trophy
              className={cn(
                'ml-2 h-5 w-5 transition-all duration-300',
                activeTab === 'achievements'
                  ? 'text-fuchsia-400 drop-shadow-lg'
                  : 'group-hover:text-fuchsia-400'
              )}
            />
          </button>

          <button
            onClick={() => setActiveTab('puzzles')}
            className={cn(
              'cyber-card cyber-card-hover flex items-center justify-between rounded-lg px-6 py-4 sm:py-3',
              'group w-full transition-all duration-300 ease-in-out',
              activeTab === 'puzzles'
                ? 'cyber-card-selected neon-glow-cyan'
                : 'hover:border-emerald-400/60'
            )}
          >
            <span className="font-semibold">Puzzle Quests</span>
            <Puzzle
              className={cn(
                'ml-2 h-5 w-5 transition-all duration-300',
                activeTab === 'puzzles'
                  ? 'text-emerald-400 drop-shadow-lg'
                  : 'group-hover:text-emerald-400'
              )}
            />
          </button>
        </div>

        {/* Content */}
        {renderContent()}
      </main>
    </div>
  );
}
